// ▪ Файл сервер/src/modules/sales.js: «комната» продажи. Адрес POST /api/sales оформляет чек одной неделимой операцией:
// проверка наличия и лимита скидки, чек и строки, списание остатка, запись в журнал. Либо всё, либо ничего.
// Цены сервер берёт из базы (экрану в этом не верим); закупка в ответ не попадает.
import { requirePermission } from '../auth/routes.js';
import { audit } from '../auth/auth.js';

// Ошибка «по делу» (не хватает товара, скидка выше лимита): отменяем операцию и отвечаем человеку понятным текстом
class SaleError extends Error {
  constructor(status, code, text, extra = {}) { super(text); this.status = status; this.code = code; this.extra = extra; }
}

// Какая скидка разрешена этой роли, %: владелец без ограничений, старший продавец и продавец по правилам магазина (таблица rules).
// Своя роль, созданная позже, получает самый строгий лимит: безопаснее.
function discountLimitPct(db, user) {
  if (user.role.code === 'owner') return 100;
  const key = user.role.code === 'senior_seller' ? 'disc_senior_pct' : 'disc_seller_pct';
  return db.prepare('SELECT value FROM rules WHERE key = ?').get(key)?.value ?? 0;
}

// Где продаём: у сотрудника с магазином только в нём; у владельца (магазина нет) магазин указывает экран
function resolveShop(db, user, shopId) {
  const wanted = user.shop ? user.shop.id : shopId;
  if (user.shop && shopId != null && shopId !== user.shop.id) {
    throw new SaleError(403, 'wrong_shop', 'Продавать можно только в своём магазине');
  }
  const shop = wanted == null ? null : db.prepare("SELECT id, name FROM shops WHERE id = ? AND kind = 'shop' AND is_active = 1").get(wanted);
  if (!shop) throw new SaleError(400, 'bad_shop', 'Выберите магазин, в котором идёт продажа');
  return shop;
}

// Чек в том виде, в каком его получает экран (без закупки). stock: «доступно» по этим вариантам в магазине после продажи.
function saleView(db, saleId) {
  const s = db.prepare(`
    SELECT s.id, s.uid, s.shop_id, sh.name AS shop_name, s.staff_id, s.client_id, s.payment, s.subtotal_kopecks,
           s.discount_pct, s.discount_kopecks, s.total_kopecks, s.sold_at
      FROM sales s JOIN shops sh ON sh.id = s.shop_id WHERE s.id = ?`).get(saleId);
  const items = db.prepare(`
    SELECT i.variant_id, i.qty, i.price_kopecks, i.paid_kopecks, v.size, p.name, p.article
      FROM sale_items i JOIN variants v ON v.id = i.variant_id JOIN products p ON p.id = v.product_id
     WHERE i.sale_id = ? ORDER BY i.id`).all(saleId);
  const now = new Date().toISOString();
  const stock = items.map((i) => {
    const onShelf = db.prepare('SELECT qty FROM stock WHERE variant_id = ? AND shop_id = ?').get(i.variant_id, s.shop_id)?.qty ?? 0;
    const held = db.prepare('SELECT COALESCE(SUM(qty), 0) AS n FROM holds WHERE variant_id = ? AND shop_id = ? AND expires_at > ?').get(i.variant_id, s.shop_id, now).n;
    return { variantId: i.variant_id, available: Math.max(0, onShelf - held) };
  });
  return {
    id: s.id, uid: s.uid, shop: { id: s.shop_id, name: s.shop_name }, staffId: s.staff_id, clientId: s.client_id, payment: s.payment,
    subtotalKopecks: s.subtotal_kopecks, discountPct: s.discount_pct, discountKopecks: s.discount_kopecks, totalKopecks: s.total_kopecks, soldAt: s.sold_at,
    items: items.map((i) => ({ variantId: i.variant_id, name: i.name, article: i.article, size: i.size, qty: i.qty, priceKopecks: i.price_kopecks, paidKopecks: i.paid_kopecks })),
    stock,
  };
}

// Оформить продажу. body: { uid, payment, discountPct, shopId?, items: [{ variantId, qty }] }.
// Возвращает { ok: true, sale, duplicate } или { ok: false, status, code, error, ... }.
export function createSale(db, user, body) {
  // Тот же чек уже оформлен (повторная отправка): второй не создаём, отдаём первый
  const same = db.prepare('SELECT id, staff_id FROM sales WHERE uid = ?').get(body.uid);
  if (same) {
    if (same.staff_id !== user.id) return { ok: false, status: 409, code: 'uid_conflict', error: 'Этот номер чека уже занят' };
    return { ok: true, duplicate: true, sale: saleView(db, same.id) };
  }

  db.exec('BEGIN IMMEDIATE');   // с этого момента база «наша», пока не закончим: двое одновременно не продадут одну и ту же вещь
  try {
    const shop = resolveShop(db, user, body.shopId ?? null);
    const pct = body.discountPct ?? 0;
    const maxPct = discountLimitPct(db, user);
    if (pct > maxPct) throw new SaleError(403, 'discount_too_high', `Ваш предел скидки ${maxPct}%`, { maxPct });

    // одинаковые строки складываем (два раза «M» это два штуки)
    const want = new Map();
    for (const it of body.items) want.set(it.variantId, (want.get(it.variantId) ?? 0) + it.qty);

    const now = new Date().toISOString();
    const lines = [];
    const shortages = [];
    for (const [variantId, qty] of want) {
      const v = db.prepare(`
        SELECT v.id, v.size, p.id AS product_id, p.name, p.price_kopecks
          FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ? AND p.is_active = 1`).get(variantId);
      if (!v) throw new SaleError(400, 'unknown_item', 'Такого товара нет или он снят с продажи');
      const onShelf = db.prepare('SELECT qty FROM stock WHERE variant_id = ? AND shop_id = ?').get(variantId, shop.id)?.qty ?? 0;
      const held = db.prepare('SELECT COALESCE(SUM(qty), 0) AS n FROM holds WHERE variant_id = ? AND shop_id = ? AND expires_at > ?').get(variantId, shop.id, now).n;
      const available = Math.max(0, onShelf - held);   // забронированное для другого клиента не продаём
      if (qty > available) shortages.push({ variantId, name: v.name, size: v.size, available });
      const cost = db.prepare('SELECT cost_kopecks FROM batches WHERE product_id = ? ORDER BY received_at DESC, id DESC LIMIT 1').get(v.product_id)?.cost_kopecks ?? 0;
      lines.push({ variantId, qty, price: v.price_kopecks, cost });
    }
    if (shortages.length) {
      const first = shortages[0];
      throw new SaleError(409, 'not_enough', `Не хватает: ${first.name}, размер ${first.size}. Доступно ${first.available}`, { shortages });
    }

    // Деньги: скидка на весь чек, потом раскладываем её по строкам (остаток копеек уходит в последнюю), чтобы сумма строк точно сошлась с итогом
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const discount = Math.round((subtotal * pct) / 100);
    const total = subtotal - discount;
    let left = discount;
    lines.forEach((l, i) => {
      const sub = l.price * l.qty;
      const d = i === lines.length - 1 ? left : subtotal === 0 ? 0 : Math.floor((sub * discount) / subtotal);
      left -= d;
      l.paid = sub - d;
    });

    const saleId = Number(db.prepare(`
      INSERT INTO sales (uid, shop_id, staff_id, payment, subtotal_kopecks, discount_pct, discount_kopecks, total_kopecks, sold_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(body.uid, shop.id, user.id, body.payment, subtotal, pct, discount, total, now).lastInsertRowid);
    const addItem = db.prepare('INSERT INTO sale_items (sale_id, variant_id, qty, price_kopecks, cost_kopecks, paid_kopecks) VALUES (?, ?, ?, ?, ?, ?)');
    const take = db.prepare('UPDATE stock SET qty = qty - ? WHERE variant_id = ? AND shop_id = ? AND qty >= ?');
    for (const l of lines) {
      addItem.run(saleId, l.variantId, l.qty, l.price, l.cost, l.paid);
      if (take.run(l.qty, l.variantId, shop.id, l.qty).changes !== 1) throw new SaleError(409, 'not_enough', 'Остаток изменился, повторите продажу');
    }
    audit(db, user.id, 'sale', `sale:${saleId}`, { shop: shop.name, total, items: lines.reduce((s, l) => s + l.qty, 0) });
    db.exec('COMMIT');
    return { ok: true, duplicate: false, sale: saleView(db, saleId) };
  } catch (err) {
    db.exec('ROLLBACK');
    if (err instanceof SaleError) return { ok: false, status: err.status, code: err.code, error: err.message, ...err.extra };
    throw err;
  }
}

const str = (min, max) => ({ type: 'string', minLength: min, maxLength: max });

export function registerSales(app, { db }) {
  app.post('/api/sales', {
    preHandler: requirePermission('sale', { write: true }),
    schema: {
      body: {
        type: 'object',
        required: ['uid', 'payment', 'items'],
        properties: {
          uid: str(8, 64),
          payment: { type: 'string', enum: ['cash', 'card', 'transfer'] },
          discountPct: { type: 'integer', minimum: 0, maximum: 100 },
          shopId: { type: ['integer', 'null'] },
          items: {
            type: 'array', minItems: 1, maxItems: 100,
            items: { type: 'object', required: ['variantId', 'qty'], properties: { variantId: { type: 'integer' }, qty: { type: 'integer', minimum: 1, maximum: 999 } } },
          },
        },
      },
    },
  }, async (req, reply) => {
    const res = createSale(db, req.user, req.body);
    if (!res.ok) { const { status, ...body } = res; return reply.code(status).send(body); }
    return reply.code(res.duplicate ? 200 : 201).send({ ok: true, duplicate: res.duplicate, sale: res.sale });
  });
}
