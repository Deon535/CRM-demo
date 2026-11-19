// ▪ Файл сервер/tests/sales.test.js: автоматические проверки продажи («Продано»): списание остатка, лимит скидки, нехватка, бронь, повтор чека, права. Запуск: npm run test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '../src/db/db.js';
import { seedDemo, DEMO_PIN } from '../src/db/seed-demo.js';
import { buildApp } from '../src/build-app.js';

// Свежая база и сервер для каждой проверки: проверки не зависят друг от друга
async function fresh() {
  const db = openDb(':memory:');
  migrate(db);
  seedDemo(db);
  const app = await buildApp(db, { logger: false });
  const cookies = {};
  let n = 0;
  const cookieOf = async (login) => {
    if (!cookies[login]) {
      const r = await app.inject({ method: 'POST', url: '/api/login', payload: { login, pin: DEMO_PIN } });
      cookies[login] = String(r.headers['set-cookie']).split(';')[0];
    }
    return cookies[login];
  };
  return {
    db, app,
    variant: (article, size) => db.prepare('SELECT v.id FROM variants v JOIN products p ON p.id = v.product_id WHERE p.article = ? AND v.size = ?').get(article, size).id,
    shelf: (article, size, shop) => db.prepare(`SELECT COALESCE((SELECT qty FROM stock WHERE variant_id = v.id AND shop_id = (SELECT id FROM shops WHERE name = ?)), 0) AS n
      FROM variants v JOIN products p ON p.id = v.product_id WHERE p.article = ? AND v.size = ?`).get(shop, article, size).n,
    count: (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
    // body без uid получает новый уникальный
    sell: async (login, body) => app.inject({
      method: 'POST', url: '/api/sales', headers: login ? { cookie: await cookieOf(login) } : {},
      payload: { uid: `test-uid-${++n}-abcdef`, payment: 'cash', ...body },
    }),
  };
}

test('продажа меняет всё вместе: чек, строки, остаток, журнал; итог и скидка считаются в копейках', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90'), socks = t.variant('SK-CT', '39–42');
  // Мурад, Каспийск: ремень 90 (было 2) и 2 пары носков (было 10), скидка 5%
  const res = await t.sell('murad', { discountPct: 5, items: [{ variantId: belt, qty: 1 }, { variantId: socks, qty: 2 }] });
  assert.equal(res.statusCode, 201);
  const { sale } = res.json();
  assert.equal(sale.subtotalKopecks, 199000 + 2 * 39000);           // 2 770 ₽
  assert.equal(sale.discountKopecks, 13850);                         // 5%
  assert.equal(sale.totalKopecks, 263150);
  assert.equal(sale.shop.name, 'Каспийск');
  assert.equal(sale.items.reduce((s, i) => s + i.paidKopecks, 0), sale.totalKopecks);   // строки сходятся с итогом до копейки
  assert.equal(t.shelf('BL-BK', '90', 'Каспийск'), 1);
  assert.equal(t.shelf('SK-CT', '39–42', 'Каспийск'), 8);
  assert.equal(t.shelf('BL-BK', '90', 'Махачкала'), 4);              // чужие магазины не тронуты
  assert.equal(t.count('sales'), 1);
  assert.equal(t.count('sale_items'), 2);
  assert.equal(t.db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'sale'").get().n, 1);
  assert.doesNotMatch(res.body, /cost/i);                           // продавцу закупка не приходит ни в каком виде
  // закупка записана «снимком» (для будущей прибыли), но только в базе
  assert.equal(t.db.prepare('SELECT cost_kopecks FROM sale_items WHERE variant_id = ?').get(belt).cost_kopecks, 80000);
});

test('скидка выше лимита роли отклоняется, и ничего не меняется', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90');
  const bad = await t.sell('murad', { discountPct: 6, items: [{ variantId: belt, qty: 1 }] });   // продавец: до 5%
  assert.equal(bad.statusCode, 403);
  assert.equal(bad.json().code, 'discount_too_high');
  assert.equal(bad.json().maxPct, 5);
  assert.equal(t.count('sales'), 0);
  assert.equal(t.shelf('BL-BK', '90', 'Каспийск'), 2);
  assert.equal((await t.sell('murad', { discountPct: 5, items: [{ variantId: belt, qty: 1 }] })).statusCode, 201);
  // старший продавец (Махачкала): до 10%, 11% нельзя
  assert.equal((await t.sell('ruslan', { discountPct: 11, items: [{ variantId: belt, qty: 1 }] })).statusCode, 403);
  assert.equal((await t.sell('ruslan', { discountPct: 10, items: [{ variantId: belt, qty: 1 }] })).statusCode, 201);
  // владелец без предела (магазин указывает сам)
  const shop = t.db.prepare("SELECT id FROM shops WHERE name = 'Дербент'").get().id;
  assert.equal((await t.sell('magomed', { shopId: shop, discountPct: 50, items: [{ variantId: belt, qty: 1 }] })).statusCode, 201);
});

test('не хватает товара: отказ, остаток и чеки не меняются; чужую бронь не продаём', async () => {
  const t = await fresh();
  const chinos48 = t.variant('CH-BL', '48'), belt = t.variant('BL-BK', '90');
  // Каспийск: чинос 48 всего 1 шт. Строка с нехваткой отменяет весь чек, даже годную строку с ремнём
  const bad = await t.sell('murad', { items: [{ variantId: belt, qty: 1 }, { variantId: chinos48, qty: 2 }] });
  assert.equal(bad.statusCode, 409);
  assert.equal(bad.json().code, 'not_enough');
  assert.deepEqual(bad.json().shortages.map((s) => [s.size, s.available]), [['48', 1]]);
  assert.equal(t.count('sales'), 0);
  assert.equal(t.shelf('BL-BK', '90', 'Каспийск'), 2);
  // Махачкала, Oxford M: на полке 4, одна в брони, доступно 3
  const oxM = t.variant('OX-WH', 'M');
  assert.equal(t.shelf('OX-WH', 'M', 'Махачкала'), 4);
  assert.equal((await t.sell('ruslan', { items: [{ variantId: oxM, qty: 4 }] })).statusCode, 409);
  assert.equal((await t.sell('ruslan', { items: [{ variantId: oxM, qty: 3 }] })).statusCode, 201);
  assert.equal(t.shelf('OX-WH', 'M', 'Махачкала'), 1);               // осталась забронированная
  assert.equal((await t.sell('ruslan', { items: [{ variantId: oxM, qty: 1 }] })).statusCode, 409);
});

test('двое подряд продают последние штуки: первый успевает, второй получает «не хватает»', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90');   // Каспийск: 2 шт.
  assert.equal((await t.sell('murad', { items: [{ variantId: belt, qty: 2 }] })).statusCode, 201);
  const second = await t.sell('zaur', { items: [{ variantId: belt, qty: 1 }] });
  assert.equal(second.statusCode, 409);
  assert.equal(second.json().shortages[0].available, 0);
  assert.equal(t.shelf('BL-BK', '90', 'Каспийск'), 0);
});

test('повторная отправка того же чека не создаёт второй и не списывает остаток дважды', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90');
  const body = { uid: 'same-receipt-0001', payment: 'card', items: [{ variantId: belt, qty: 1 }] };
  const a = await t.sell('murad', body);
  const b = await t.sell('murad', body);
  assert.equal(a.statusCode, 201);
  assert.equal(b.statusCode, 200);
  assert.equal(b.json().duplicate, true);
  assert.equal(b.json().sale.id, a.json().sale.id);
  assert.equal(t.count('sales'), 1);
  assert.equal(t.shelf('BL-BK', '90', 'Каспийск'), 1);
  // чужой сотрудник с тем же номером чека получает отказ
  assert.equal((await t.sell('zaur', body)).statusCode, 409);
});

test('права и магазин: курьер, бухгалтер и без входа нельзя; продавец только в своём магазине; владельцу нужен магазин', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90');
  const items = [{ variantId: belt, qty: 1 }];
  assert.equal((await t.sell('ismail', { items })).statusCode, 403);
  assert.equal((await t.sell('zarema', { items })).statusCode, 403);
  assert.equal((await t.sell(null, { items })).statusCode, 401);
  const other = t.db.prepare("SELECT id FROM shops WHERE name = 'Дербент'").get().id;
  const wrong = await t.sell('murad', { shopId: other, items });       // Мурад в Каспийске
  assert.equal(wrong.statusCode, 403);
  assert.equal(wrong.json().code, 'wrong_shop');
  const noShop = await t.sell('magomed', { items });
  assert.equal(noShop.statusCode, 400);
  assert.equal(noShop.json().code, 'bad_shop');
  const wh = t.db.prepare("SELECT id FROM shops WHERE kind = 'warehouse'").get().id;   // со склада не продают
  assert.equal((await t.sell('magomed', { shopId: wh, items })).statusCode, 400);
  assert.equal(t.count('sales'), 0);
});

test('неверные данные: пустой чек, нулевое количество, неизвестный товар, неверная оплата', async () => {
  const t = await fresh();
  const belt = t.variant('BL-BK', '90');
  assert.equal((await t.sell('murad', { items: [] })).statusCode, 400);
  assert.equal((await t.sell('murad', { items: [{ variantId: belt, qty: 0 }] })).statusCode, 400);
  assert.equal((await t.sell('murad', { items: [{ variantId: 99999, qty: 1 }] })).statusCode, 400);
  assert.equal((await t.sell('murad', { payment: 'bitcoin', items: [{ variantId: belt, qty: 1 }] })).statusCode, 400);
  assert.equal((await t.sell('murad', { discountPct: -1, items: [{ variantId: belt, qty: 1 }] })).statusCode, 400);
  assert.equal(t.count('sales'), 0);
});

test('каталог теперь отдаёт номера вариантов (размеров) в том же порядке, что и размеры', async () => {
  const t = await fresh();
  const login = await t.app.inject({ method: 'POST', url: '/api/login', payload: { login: 'murad', pin: DEMO_PIN } });
  const cookie = String(login.headers['set-cookie']).split(';')[0];
  const item = (await t.app.inject({ method: 'GET', url: '/api/products', headers: { cookie } })).json().items.find((i) => i.article === 'OX-WH');
  assert.equal(item.variantIds.length, item.sizes.length);
  assert.equal(item.variantIds[item.sizes.indexOf('M')], t.variant('OX-WH', 'M'));
});
