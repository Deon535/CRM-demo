// ▪ Файл сервер/src/app.js: запуск сервера. Открывает базу, применяет миграции, собирает сервер (build-app.js) и включает его.
import { openDb, migrate } from './db/db.js';
import { buildApp } from './build-app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // 127.0.0.1 = только этот компьютер (localhost)

const db = openDb();            // файл базы (сервер/data/crm.db), если его нет, он создаётся
const applied = migrate(db);    // применяем новые миграции (если они есть)

const app = await buildApp(db);
if (applied.length) app.log.info(`Применены миграции: ${applied.join(', ')}`);
app.addHook('onClose', async () => db.close());

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
