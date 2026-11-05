// ▪ Файл сервер/src/app.js: запуск сервера. Раздаёт экран (папка приложение/) и отвечает на вопросы API (адреса /api/...).
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // 127.0.0.1 = только этот компьютер (localhost)
const SCREEN_DIR = path.join(import.meta.dirname, '..', '..', 'приложение');

const app = Fastify({ logger: true });

// Адрес проверки: «сервер жив?»
app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

// Всё остальное (адрес «/», файлы css и js) берётся из папки приложение/
await app.register(fastifyStatic, { root: SCREEN_DIR });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
