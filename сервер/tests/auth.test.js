// ▪ Файл сервер/tests/auth.test.js: автоматические проверки входа, прав и сотрудников. Запуск: npm run test (база в памяти, настоящая не трогается).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '../src/db/db.js';
import { seedDemo, DEMO_PIN } from '../src/db/seed-demo.js';
import { buildApp } from '../src/build-app.js';
import { can, dismissStaff } from '../src/auth/auth.js';

const db = openDb(':memory:');
migrate(db);
seedDemo(db);
const app = await buildApp(db, { logger: false });

const post = (url, payload, cookie) => app.inject({ method: 'POST', url, payload, headers: cookie ? { cookie } : {} });
const get = (url, cookie) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
const idOf = (login) => db.prepare('SELECT id FROM staff WHERE login = ?').get(login).id;

// Войти и получить cookie с пропуском
async function signIn(login, pin = DEMO_PIN) {
  const res = await post('/api/login', { login, pin });
  const raw = res.headers['set-cookie'];
  return { res, cookie: raw ? String(raw).split(';')[0] : null };
}

test('вход по верному ПИН: выдаётся пропуск, /api/me показывает роль и права', async () => {
  const { res, cookie } = await signIn('murad');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['set-cookie'], /HttpOnly/);
  const me = (await get('/api/me', cookie)).json().user;
  assert.equal(me.role.code, 'seller');
  assert.equal(me.shop.name, 'Каспийск');
  assert.ok(me.permissions.sale);
  assert.equal(me.permissions.cost, undefined);   // закупочных цен у продавца нет
});

test('неверный ПИН и неизвестный логин отвечают одинаково', async () => {
  const a = await signIn('ali', '9999');
  const b = await signIn('nobody', DEMO_PIN);
  assert.equal(a.res.statusCode, 401);
  assert.equal(b.res.statusCode, 401);
  assert.deepEqual(a.res.json(), b.res.json());
});

test('после 5 неверных ПИН вход блокируется, даже с верным ПИН', async () => {
  for (let i = 0; i < 4; i++) assert.equal((await signIn('timur', '1111')).res.statusCode, 401);
  assert.equal((await signIn('timur', '1111')).res.statusCode, 429);
  assert.equal((await signIn('timur')).res.statusCode, 429);
  db.prepare("UPDATE staff SET locked_until = '2000-01-01T00:00:00.000Z' WHERE login = 'timur'").run();   // «прошло 15 минут»
  assert.equal((await signIn('timur')).res.statusCode, 200);
});

test('без пропуска и с просроченным пропуском доступа нет', async () => {
  assert.equal((await get('/api/me')).statusCode, 401);
  const { cookie } = await signIn('rashid');
  assert.equal((await get('/api/me', cookie)).statusCode, 200);
  db.prepare('UPDATE sessions SET expires_at = ? WHERE staff_id = ?').run('2000-01-01T00:00:00.000Z', idOf('rashid'));
  assert.equal((await get('/api/me', cookie)).statusCode, 401);
});

test('создание сотрудника: продавцу нельзя, владельцу можно; до смены ПИН доступ закрыт', async () => {
  const seller = await signIn('ali');
  const body = { login: 'newowner', fullName: 'Новый Владелец', roleCode: 'owner', shopId: null };
  assert.equal((await post('/api/staff', body, seller.cookie)).statusCode, 403);

  const owner = await signIn('magomed');
  const created = await post('/api/staff', body, owner.cookie);
  assert.equal(created.statusCode, 200);
  const { tempPin } = created.json();
  assert.match(tempPin, /^\d{6}$/);
  assert.equal((await post('/api/staff', body, owner.cookie)).statusCode, 409);   // такой логин уже занят

  const first = await signIn('newowner', tempPin);
  assert.equal(first.res.statusCode, 200);
  assert.equal(first.res.json().user.mustChangePin, true);
  const blocked = await post('/api/staff', { ...body, login: 'second' }, first.cookie);
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.json().code, 'must_change_pin');

  assert.equal((await post('/api/me/pin', { currentPin: tempPin, newPin: '135790' }, first.cookie)).statusCode, 200);
  assert.equal((await post('/api/staff', { ...body, login: 'second' }, first.cookie)).statusCode, 200);
});

test('смена ПИН: старый перестаёт работать, новый работает', async () => {
  const { cookie } = await signIn('patimat');
  assert.equal((await post('/api/me/pin', { currentPin: '0000', newPin: '864209' }, cookie)).statusCode, 401);   // неверный текущий
  assert.equal((await post('/api/me/pin', { currentPin: DEMO_PIN, newPin: '12' }, cookie)).statusCode, 400);     // слишком короткий
  assert.equal((await post('/api/me/pin', { currentPin: DEMO_PIN, newPin: '864209' }, cookie)).statusCode, 200);
  assert.equal((await signIn('patimat', DEMO_PIN)).res.statusCode, 401);
  assert.equal((await signIn('patimat', '864209')).res.statusCode, 200);
});

test('«Уволить»: пропуск пропадает сразу, войти заново нельзя; своими правами продавец не уволит', async () => {
  const owner = await signIn('magomed');
  const kamil = await signIn('kamil');
  const seller = await signIn('zaur');   // старший продавец, права «Сотрудники» у него нет
  assert.equal((await get('/api/me', kamil.cookie)).statusCode, 200);
  assert.equal((await post(`/api/staff/${idOf('kamil')}/dismiss`, {}, seller.cookie)).statusCode, 403);
  assert.equal((await post(`/api/staff/${idOf('kamil')}/dismiss`, {}, owner.cookie)).statusCode, 200);
  assert.equal((await get('/api/me', kamil.cookie)).statusCode, 401);
  assert.equal((await signIn('kamil')).res.statusCode, 401);
  assert.equal((await post(`/api/staff/${idOf('magomed')}/dismiss`, {}, owner.cookie)).statusCode, 400);   // себя нельзя
});

test('последнего владельца уволить нельзя', () => {
  const db2 = openDb(':memory:');
  migrate(db2);
  seedDemo(db2);
  const res = dismissStaff(db2, { id: 999 }, db2.prepare("SELECT id FROM staff WHERE login = 'magomed'").get().id);
  assert.deepEqual(res, { ok: false, code: 'last_owner' });
});

test('права по ролям соответствуют ТЗ: закупка только у владельца и бухгалтера, курьер видит свои заказы', async () => {
  const me = async (login) => (await get('/api/me', (await signIn(login)).cookie)).json().user;
  const owner = await me('magomed');
  const senior = await me('ruslan');
  const seller = await me('ali');
  const courier = await me('ismail');
  const accountant = await me('zarema');
  assert.ok(can(owner, 'cost') && can(accountant, 'cost'));
  assert.ok(!can(senior, 'cost') && !can(seller, 'cost') && !can(courier, 'cost'));
  assert.ok(can(owner, 'profit') && !can(accountant, 'profit'));
  assert.equal(can(senior, 'cash').scope, 'shop');
  assert.equal(can(seller, 'cash').scope, 'own');
  assert.equal(can(seller, 'return').limitKopecks, 300000);
  assert.equal(can(courier, 'orders').scope, 'own');
  assert.ok(can(accountant, 'expenses') && !can(accountant, 'expenses', { write: true }));   // бухгалтер только смотрит
  assert.ok(can(senior, 'orders') && !can(senior, 'orders', { write: true }));
  assert.ok(!can(courier, 'sale') && !can(accountant, 'sale'));
});

test('журнал записывает входы, неверные ПИН и блокировки', () => {
  const actions = db.prepare('SELECT DISTINCT action FROM audit_log').all().map((r) => r.action);
  for (const a of ['login', 'pin_failed', 'login_locked', 'staff_created', 'staff_dismissed', 'pin_changed']) assert.ok(actions.includes(a), `нет записи ${a}`);
});
