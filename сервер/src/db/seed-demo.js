// ▪ Файл сервер/src/db/seed-demo.js: демо-данные для «сбросить демо»: магазины (seed-demo.sql), сотрудники и товары. На настоящую базу клиента не применяются.
import fs from 'node:fs';
import path from 'node:path';
import { hashPin } from '../auth/crypto.js';

// Демо-ПИН: один на всех демо-сотрудников, чтобы удобно показывать. У каждого всё равно свой отпечаток (хэш).
export const DEMO_PIN = '2468';

// Сотрудники демо (js/data.js, STAFF), номера те же. Владелец и бухгалтер придуманы: в списке «Люди» их нет.
// [id, логин, имя, код роли, магазин (null = все), телефон]
const DEMO_STAFF = [
  [1,  'ruslan',  'Руслан Алиев',     'senior_seller',  'Махачкала', '+7 928 555-02-01'],
  [2,  'zaur',    'Заур Исаев',       'senior_seller',  'Каспийск',  '+7 928 555-02-02'],
  [3,  'murad',   'Мурад Омаров',     'seller',         'Каспийск',  '+7 928 555-02-03'],
  [4,  'ali',     'Али Гасанов',      'seller',         'Дербент',   '+7 928 555-02-04'],
  [5,  'rashid',  'Рашид Магомедов',  'seller',         'Дербент',   '+7 928 555-02-05'],
  [6,  'timur',   'Тимур Рамазанов',  'seller',         'Хасавюрт',  '+7 928 555-02-06'],
  [7,  'kamil',   'Камиль Абдулаев',  'seller',         'Махачкала', '+7 928 555-02-07'],
  [8,  'patimat', 'Патимат Алиева',   'online_manager', null,        '+7 928 555-02-08'],
  [9,  'ismail',  'Исмаил Хасанов',   'courier',        null,        '+7 928 555-02-09'],
  [10, 'magomed', 'Магомед Курбанов', 'owner',          null,        '+7 928 555-02-10'],
  [11, 'zarema',  'Зарема Гаджиева',  'accountant',     null,        '+7 928 555-02-11'],
];

// Товары демо (js/data.js, DATA и EXTRA). rows: «доступно» по магазинам (порядок SHOP_NAMES) и размерам (порядок sizes).
// hold: бронь, она вычитается из «доступно», поэтому «на полке» записываем на столько же больше.
export const SHOP_NAMES = ['Махачкала', 'Каспийск', 'Дербент', 'Хасавюрт'];
const DEMO_PRODUCTS = [
  { art: 'OX-WH', name: 'Рубашка Oxford', cat: 'Рубашки', color: 'белый', price: 4990, cost: 2600, sizes: ['S', 'M', 'L', 'XL'], rows: [[1, 3, 2, 0], [0, 1, 1, 0], [0, 2, 0, 1], [1, 0, 1, 0]], hold: { shop: 0, size: 1, n: 1 } },
  { art: 'CH-BL', name: 'Брюки чинос', cat: 'Брюки', color: 'синий', price: 5490, cost: 2800, sizes: ['48', '50', '52'], rows: [[0, 1, 2], [1, 0, 0], [0, 2, 0], [0, 0, 1]] },
  { art: 'JK-GR', name: 'Куртка зимняя', cat: 'Куртки', color: 'серый', price: 12900, cost: 6500, sizes: ['M', 'L', 'XL'], rows: [[1, 2, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0]] },
  { art: 'BL-BK', name: 'Ремень кожаный', cat: 'Аксессуары', color: 'чёрный', price: 1990, cost: 800, sizes: ['90', '100', '110'], rows: [[4, 5, 3], [2, 1, 0], [1, 2, 1], [1, 1, 1]] },
  { art: 'SK-CT', name: 'Носки хлопок', cat: 'Аксессуары', color: 'хлопок', price: 390, cost: 150, sizes: ['39–42', '43–46'], rows: [[40, 38], [10, 8], [12, 10], [12, 10]] },
];
const DEMO_CATEGORIES = ['Рубашки', 'Брюки', 'Куртки', 'Аксессуары'];   // порядок как в чипах фильтра на экране
const DEMO_BATCH_DATE = '2026-10-01T09:00:00.000Z';

// withHolds: класть ли демо-бронь (она ссылается на демо-сотрудника Камиля, на настоящей базе его нет)
export function seedProducts(db, { withHolds = true } = {}) {
  const shopId = db.prepare('SELECT id FROM shops WHERE name = ?');
  const addCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  DEMO_CATEGORIES.forEach((name, i) => addCat.run(name, i));
  const catId = db.prepare('SELECT id FROM categories WHERE name = ?');
  const addProduct = db.prepare('INSERT INTO products (article, name, category_id, color, price_kopecks) VALUES (?, ?, ?, ?, ?)');
  const addVariant = db.prepare('INSERT INTO variants (product_id, size, sort_order) VALUES (?, ?, ?)');
  const addStock = db.prepare('INSERT INTO stock (variant_id, shop_id, qty) VALUES (?, ?, ?)');
  const addBatch = db.prepare('INSERT INTO batches (product_id, cost_kopecks, received_at) VALUES (?, ?, ?)');
  const addHold = db.prepare('INSERT INTO holds (variant_id, shop_id, qty, expires_at, staff_id) VALUES (?, ?, ?, ?, ?)');
  for (const p of DEMO_PRODUCTS) {
    const productId = Number(addProduct.run(p.art, p.name, catId.get(p.cat).id, p.color, p.price * 100).lastInsertRowid);
    addBatch.run(productId, p.cost * 100, DEMO_BATCH_DATE);
    p.sizes.forEach((size, j) => {
      const variantId = Number(addVariant.run(productId, size, j).lastInsertRowid);
      SHOP_NAMES.forEach((shop, i) => {
        const held = withHolds && p.hold && p.hold.shop === i && p.hold.size === j ? p.hold.n : 0;
        const qty = p.rows[i][j] + held;
        if (qty > 0) addStock.run(variantId, shopId.get(shop).id, qty);
        // демо-бронь на 3 дня от момента сброса; оформил её Камиль (id 7, Махачкала)
        if (held) addHold.run(variantId, shopId.get(shop).id, held, new Date(Date.now() + 3 * 86400000).toISOString(), 7);
      });
    });
  }
}

export function seedDemo(db) {
  db.exec('BEGIN');
  try {
    db.exec(fs.readFileSync(path.join(import.meta.dirname, 'seed-demo.sql'), 'utf8'));
    const shopId = db.prepare('SELECT id FROM shops WHERE name = ?');
    const roleId = db.prepare('SELECT id FROM roles WHERE code = ?');
    const insert = db.prepare('INSERT INTO staff (id, login, full_name, phone, role_id, shop_id, pin_hash, must_change_pin) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
    for (const [id, login, name, role, shop, phone] of DEMO_STAFF) {
      insert.run(id, login, name, phone, roleId.get(role).id, shop ? shopId.get(shop).id : null, hashPin(DEMO_PIN));
    }
    seedProducts(db);   // после сотрудников: бронь ссылается на сотрудника
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
