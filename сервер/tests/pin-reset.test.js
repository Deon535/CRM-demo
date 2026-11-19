// ▪ Файл сервер/tests/pin-reset.test.js: проверки команды «забыл ПИН» (сброс на сервере). Запуск: npm run test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '../src/db/db.js';
import { seedDemo, DEMO_PIN } from '../src/db/seed-demo.js';
import { buildApp } from '../src/build-app.js';
import { resetPin } from '../src/auth/auth.js';

const login = (app, name, pin) => app.inject({ method: 'POST', url: '/api/login', payload: { login: name, pin } });

test('сброс ПИН: старый ПИН и старые пропуска перестают работать, новый временный работает и требует смены', async () => {
  const db = openDb(':memory:');
  migrate(db);
  seedDemo(db);
  const app = await buildApp(db, { logger: false });
  const oldSession = String((await login(app, 'magomed', DEMO_PIN)).headers['set-cookie']).split(';')[0];

  const res = resetPin(db, 'MAGOMED');   // регистр логина не важен
  assert.equal(res.ok, true);
  assert.match(res.tempPin, /^\d{4,6}$/);

  assert.equal((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: oldSession } })).statusCode, 401);   // старый пропуск выброшен
  assert.equal((await login(app, 'magomed', DEMO_PIN)).statusCode, 401);                                              // старый ПИН не работает
  const fresh = await login(app, 'magomed', res.tempPin);
  assert.equal(fresh.statusCode, 200);
  assert.equal(fresh.json().user.mustChangePin, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'pin_reset'").get().n, 1);
});

test('сброс снимает блокировку входа; неизвестный и уволенный логины отклоняются', async () => {
  const db = openDb(':memory:');
  migrate(db);
  seedDemo(db);
  const app = await buildApp(db, { logger: false });
  for (let i = 0; i < 5; i++) await login(app, 'murad', '0000');      // 5 неверных: вход заблокирован
  assert.equal((await login(app, 'murad', DEMO_PIN)).statusCode, 429);
  const res = resetPin(db, 'murad');
  assert.equal((await login(app, 'murad', res.tempPin)).statusCode, 200);

  assert.equal(resetPin(db, 'nobody').code, 'not_found');
  db.prepare("UPDATE staff SET is_active = 0 WHERE login = 'ali'").run();
  assert.equal(resetPin(db, 'ali').code, 'inactive');
});
