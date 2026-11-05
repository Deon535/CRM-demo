// ▪ Файл сервер/src/auth/crypto.js: «мясорубка» для ПИН (хэш), случайные пропуска. Только встроенные средства Node.
import crypto from 'node:crypto';

// ПИН превращается в необратимый отпечаток (хэш) со случайной «щепоткой соли»: у двух людей с одинаковым ПИН отпечатки разные.
export function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// Проверка: пропускаем введённый ПИН через ту же «мясорубку» и сравниваем отпечатки
export function verifyPin(pin, stored) {
  const [kind, saltHex, hashHex] = String(stored).split('$');
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Отпечаток для «несуществующего» логина: чтобы время ответа не выдавало, есть ли такой логин
export const DUMMY_HASH = hashPin('000000');

// Новый пропуск: длинный случайный номер. В cookie лежит сам номер, в базе только его отпечаток.
export function newToken() { return crypto.randomBytes(32).toString('hex'); }
export function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

// Временный ПИН для нового сотрудника: 6 цифр
export function randomPin() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
