// ▪ Файл сервер/tests/owner.test.js: проверки «создать первого владельца» и «замка» на db:reset. База в памяти.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '../src/db/db.js';
import { seedDemo } from '../src/db/seed-demo.js';
import { createFirstOwner, isRealInstall, login, getUserByToken, validPin } from '../src/auth/auth.js';

function freshDb() {
  const db = openDb(':memory:');
  migrate(db);
  return db;
}

test('первый владелец создаётся, входит по временному ПИН и обязан его сменить', () => {
  const db = freshDb();
  assert.equal(isRealInstall(db), false);
  const res = createFirstOwner(db, { login: 'boss', fullName: 'Иван Иванов' });
  assert.equal(res.ok, true);
  assert.ok(validPin(res.tempPin));
  assert.equal(isRealInstall(db), true);
  const session = login(db, 'boss', res.tempPin);
  assert.equal(session.ok, true);
  const me = getUserByToken(db, session.token);
  assert.equal(me.role.code, 'owner');
  assert.equal(me.mustChangePin, true);
  assert.ok(me.permissions.staff && me.permissions.profit);   // у владельца права на людей и прибыль
  const stored = db.prepare('SELECT pin_hash FROM staff WHERE login = ?').get('boss').pin_hash;
  assert.ok(!stored.includes(res.tempPin));                    // в базе только отпечаток, не сам ПИН
});

test('второго «первого» владельца создать нельзя, плохие логин и имя отвергаются', () => {
  const db = freshDb();
  assert.equal(createFirstOwner(db, { login: 'a', fullName: 'Иван' }).code, 'bad_login');
  assert.equal(createFirstOwner(db, { login: 'boss', fullName: '  ' }).code, 'bad_name');
  assert.equal(createFirstOwner(db, { login: 'boss', fullName: 'Иван' }).ok, true);
  assert.equal(createFirstOwner(db, { login: 'boss2', fullName: 'Пётр' }).code, 'owner_exists');
  assert.equal(db.prepare('SELECT count(*) AS n FROM staff').get().n, 1);
});

test('в демо-базе владелец уже есть, поэтому команда отказывает, а «замок» не считает её настоящей', () => {
  const db = freshDb();
  seedDemo(db);
  assert.equal(createFirstOwner(db, { login: 'boss', fullName: 'Иван' }).code, 'owner_exists');
  assert.equal(isRealInstall(db), false);   // демо можно сбрасывать
});
