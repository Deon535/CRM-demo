// ▪ Файл сервер/tests/products.test.js: автоматические проверки каталога товаров (права, закупочные цены, остатки и бронь). Запуск: npm run test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '../src/db/db.js';
import { seedDemo, DEMO_PIN } from '../src/db/seed-demo.js';
import { buildApp } from '../src/build-app.js';

const db = openDb(':memory:');
migrate(db);
seedDemo(db);
const app = await buildApp(db, { logger: false });

async function catalogAs(login) {
  const res = await app.inject({ method: 'POST', url: '/api/login', payload: { login, pin: DEMO_PIN } });
  const cookie = String(res.headers['set-cookie']).split(';')[0];
  return app.inject({ method: 'GET', url: '/api/products', headers: { cookie } });
}

test('продавец получает каталог без единого намёка на закупочные цены', async () => {
  const res = await catalogAs('murad');
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(res.body, /cost/i);   // ни поля, ни слова: ни в товарах, ни в служебных данных
  const cat = res.json();
  assert.equal(cat.items.length, 5);
  assert.deepEqual(cat.shops, ['Махачкала', 'Каспийск', 'Дербент', 'Хасавюрт']);
  assert.deepEqual(cat.categories, ['Рубашки', 'Брюки', 'Куртки', 'Аксессуары']);
});

test('владелец видит закупку, в копейках, по последней партии', async () => {
  const oxford = (await catalogAs('magomed')).json().items.find((i) => i.article === 'OX-WH');
  assert.equal(oxford.priceKopecks, 499000);
  assert.equal(oxford.costKopecks, 260000);
  // новая партия по другой цене становится «последней»
  const id = db.prepare("SELECT id FROM products WHERE article = 'OX-WH'").get().id;
  db.prepare("INSERT INTO batches (product_id, cost_kopecks, received_at) VALUES (?, 270000, '2026-10-20T09:00:00.000Z')").run(id);
  assert.equal((await catalogAs('magomed')).json().items.find((i) => i.article === 'OX-WH').costKopecks, 270000);
});

test('остатки совпадают с демо; бронь вычитается из «доступно», просроченная нет', async () => {
  const oxford = () => catalogAs('ruslan').then((r) => r.json().items.find((i) => i.article === 'OX-WH'));
  const a = await oxford();
  assert.deepEqual(a.sizes, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(a.rows, [[1, 3, 2, 0], [0, 1, 1, 0], [0, 2, 0, 1], [1, 0, 1, 0]]);   // как в js/data.js
  assert.deepEqual(a.holds, [{ shop: 0, size: 1, n: 1 }]);
  db.prepare("UPDATE holds SET expires_at = '2000-01-01T00:00:00.000Z'").run();           // «срок брони прошёл»
  const b = await oxford();
  assert.equal(b.rows[0][1], 4);   // 3 доступно + 1 вернулась из брони
  assert.deepEqual(b.holds, []);
});

test('курьер и бухгалтер каталог не получают, без входа тоже нельзя', async () => {
  assert.equal((await catalogAs('ismail')).statusCode, 403);
  assert.equal((await catalogAs('zarema')).statusCode, 403);
  assert.equal((await app.inject({ method: 'GET', url: '/api/products' })).statusCode, 401);
});

test('право «Остатки» только на свой магазин: чужих магазинов в ответе нет', async () => {
  db.prepare("UPDATE role_permissions SET scope = 'shop' WHERE permission_code = 'stock' AND role_id = (SELECT id FROM roles WHERE code = 'seller')").run();
  const cat = (await catalogAs('murad')).json();   // Мурад работает в Каспийске
  assert.deepEqual(cat.shops, ['Каспийск']);
  const belt = cat.items.find((i) => i.article === 'BL-BK');
  assert.deepEqual(belt.rows, [[2, 1, 0]]);
});
