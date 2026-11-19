// ▪ Файл сервер/scripts/demo-products.js: «загрузить демо-товары» в настоящую базу (пока нет экрана ввода товаров).
// Запуск: npm run demo:products. Кладёт 4 демо-магазина (если магазинов в базе ещё нет) и те же 5 демо-товаров, что на экране.
// Если в базе уже есть товары, ничего не делает: настоящие данные не трогает. Сотрудников и броней не создаёт.
import fs from 'node:fs';
import path from 'node:path';
import { openDb, migrate, DB_FILE } from '../src/db/db.js';
import { seedProducts, SHOP_NAMES } from '../src/db/seed-demo.js';

const db = openDb();
migrate(db);

if (db.prepare('SELECT 1 FROM products LIMIT 1').get()) {
  console.log('В базе уже есть товары, ничего не добавлено.');
  db.close();
  process.exit(1);
}

db.exec('BEGIN');
try {
  if (!db.prepare('SELECT 1 FROM shops LIMIT 1').get()) {
    db.exec(fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'db', 'seed-demo.sql'), 'utf8'));   // 4 магазина и склад
  }
  const have = new Set(db.prepare("SELECT name FROM shops WHERE kind = 'shop'").all().map((s) => s.name));
  const missing = SHOP_NAMES.filter((n) => !have.has(n));
  if (missing.length) throw new Error(`в базе нет магазинов с названиями: ${missing.join(', ')}. Демо-товары раскладываются по магазинам Махачкала, Каспийск, Дербент, Хасавюрт.`);
  seedProducts(db, { withHolds: false });
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.log(`Не добавлено: ${err.message}`);
  db.close();
  process.exit(1);
}
const n = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
db.close();
console.log(`Готово: добавлено товаров ${n}. База: ${DB_FILE}`);
