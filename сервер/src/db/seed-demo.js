// ▪ Файл сервер/src/db/seed-demo.js: демо-данные для «сбросить демо»: магазины (seed-demo.sql) и сотрудники. На настоящую базу клиента не применяются.
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
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
