// ▪ Файл сервер/src/modules/products.js: «комната» товаров. Адрес GET /api/products отдаёт каталог с остатками по магазинам.
// Закупочные цены попадают в ответ только тем, у кого есть право «cost». Остальным этого поля нет вообще.
import { requirePermission } from '../auth/routes.js';
import { can } from '../auth/auth.js';

// Собирает каталог для этого человека. Пять запросов к базе на весь каталог (а не по запросу на каждый товар): так быстро и при тысячах позиций.
export function catalogFor(db, user) {
  const stockGrant = can(user, 'stock');
  const showCost = Boolean(can(user, 'cost'));

  // Магазины (колонки таблицы остатков). Если право «Остатки» ограничено своим магазином, остальные не показываем.
  let shops = db.prepare("SELECT id, name FROM shops WHERE kind = 'shop' AND is_active = 1 ORDER BY id").all();
  if (stockGrant.scope !== 'all') shops = shops.filter((s) => s.id === user.shop?.id);
  const shopIndex = new Map(shops.map((s, i) => [s.id, i]));

  const cats = db.prepare('SELECT name FROM categories ORDER BY sort_order, id').all().map((c) => c.name);

  const products = db.prepare(`
    SELECT p.id, p.article, p.name, c.name AS category, p.color, p.price_kopecks
      FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1 ORDER BY p.id`).all();

  // Закупка = цена последней партии (самая поздняя дата, при равенстве последняя запись)
  const cost = new Map();
  if (showCost) {
    for (const r of db.prepare(`
      SELECT b.product_id, b.cost_kopecks FROM batches b
       WHERE b.id = (SELECT id FROM batches WHERE product_id = b.product_id ORDER BY received_at DESC, id DESC LIMIT 1)`).all()) {
      cost.set(r.product_id, r.cost_kopecks);
    }
  }

  const sizes = new Map();      // product_id -> [{ id, size }]
  for (const v of db.prepare('SELECT v.id, v.product_id, v.size FROM variants v ORDER BY v.product_id, v.sort_order, v.id').all()) {
    if (!sizes.has(v.product_id)) sizes.set(v.product_id, []);
    sizes.get(v.product_id).push({ id: v.id, size: v.size });
  }

  const onShelf = new Map();    // "variant:shop" -> штук на полке
  for (const r of db.prepare('SELECT variant_id, shop_id, qty FROM stock').all()) onShelf.set(`${r.variant_id}:${r.shop_id}`, r.qty);
  const held = new Map();       // "variant:shop" -> штук в действующей брони
  for (const r of db.prepare('SELECT variant_id, shop_id, SUM(qty) AS qty FROM holds WHERE expires_at > ? GROUP BY variant_id, shop_id').all(new Date().toISOString())) {
    held.set(`${r.variant_id}:${r.shop_id}`, r.qty);
  }

  const items = products.map((p) => {
    const vs = sizes.get(p.id) ?? [];
    const rows = shops.map(() => vs.map(() => 0));   // rows[магазин][размер] = «доступно»
    const holds = [];
    vs.forEach((v, j) => {
      shops.forEach((s, i) => {
        const key = `${v.id}:${s.id}`;
        const h = held.get(key) ?? 0;
        rows[i][j] = Math.max(0, (onShelf.get(key) ?? 0) - h);
        if (h) holds.push({ shop: i, size: j, n: h });
      });
    });
    const item = { id: p.id, article: p.article, name: p.name, category: p.category, color: p.color, priceKopecks: p.price_kopecks, sizes: vs.map((v) => v.size), variantIds: vs.map((v) => v.id), rows, holds };
    if (showCost) item.costKopecks = cost.get(p.id) ?? null;
    return item;
  });
  return { shops: shops.map((s) => s.name), shopIds: shops.map((s) => s.id), categories: cats, items };
}

export function registerProducts(app, { db }) {
  app.get('/api/products', { preHandler: requirePermission('stock') }, async (req) => catalogFor(db, req.user));
}
