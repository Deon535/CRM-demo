// ▪ Файл сервер/src/build-app.js: сборка сервера (Fastify): вход, адреса API, раздача экрана. Запуск и тесты берут сервер отсюда.
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { registerAuth } from './auth/routes.js';
import { schemaVersion } from './db/db.js';

const SCREEN_DIR = path.join(import.meta.dirname, '..', '..', 'приложение');

export async function buildApp(db, { logger = true, secureCookies = process.env.COOKIE_SECURE === '1' } = {}) {
  // trustProxy: за «ресепшеном» (Caddy или nginx) на сервере включается переменной TRUST_PROXY=1
  const app = Fastify({ logger, trustProxy: process.env.TRUST_PROXY === '1' });

  registerAuth(app, { db, secureCookies });

  // Адрес проверки: «сервер жив?» и какая версия базы
  app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString(), schema: schemaVersion(db) }));

  // Всё остальное (адрес «/», файлы css и js) берётся из папки приложение/
  await app.register(fastifyStatic, { root: SCREEN_DIR });
  return app;
}
