// ▪ Файл сервер/src/app.js: запуск сервера. Раздаёт экран (папка приложение/) и отвечает на вопросы API (адреса /api/...).
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { openDb, migrate, schemaVersion } from './db/db.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // 127.0.0.1 = только этот компьютер (localhost)
const SCREEN_DIR = path.join(import.meta.dirname, '..', '..', 'приложение');

const db = openDb();            // файл базы (сервер/data/crm.db), если его нет, он создаётся
const applied = migrate(db);    // применяем новые миграции (если они есть)

const app = Fastify({ logger: true });
if (applied.length) app.log.info(`Применены миграции: ${applied.join(', ')}`);
app.addHook('onClose', async () => db.close());

// Адрес проверки: «сервер жив?» и какая версия базы
app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString(), schema: schemaVersion(db) }));

// Всё остальное (адрес «/», файлы css и js) берётся из папки приложение/
await app.register(fastifyStatic, { root: SCREEN_DIR });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
