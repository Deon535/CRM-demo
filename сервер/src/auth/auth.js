// ▪ Файл сервер/src/auth/auth.js: вход, пропуска, проверка прав, сотрудники. Всё про «кто спрашивает и что ему можно».
import { hashPin, verifyPin, DUMMY_HASH, newToken, hashToken, randomPin } from './crypto.js';

export const SESSION_HOURS = 12;   // срок пропуска (решил пользователь)
export const MAX_ATTEMPTS = 5;     // неверных ПИН подряд до блокировки
export const LOCK_MINUTES = 15;    // на сколько блокируется вход

const nowIso = () => new Date().toISOString();
const inMs = (ms) => new Date(Date.now() + ms).toISOString();
export const validPin = (pin) => typeof pin === 'string' && /^\d{4,6}$/.test(pin);

// Запись в журнал действий
export function audit(db, staffId, action, subject = null, details = null) {
  db.prepare('INSERT INTO audit_log (staff_id, action, subject, details) VALUES (?, ?, ?, ?)')
    .run(staffId, action, subject, details ? JSON.stringify(details) : null);
}

// Проверка ПИН со счётчиком неверных попыток. Возвращает 'ok' | 'bad' | 'locked'.
function tryPin(db, staff, pin) {
  if (staff.locked_until && staff.locked_until > nowIso()) return 'locked';
  if (validPin(pin) && verifyPin(pin, staff.pin_hash)) {
    if (staff.failed_attempts || staff.locked_until) db.prepare('UPDATE staff SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(staff.id);
    return 'ok';
  }
  const attempts = staff.failed_attempts + 1;
  audit(db, staff.id, 'pin_failed');
  if (attempts >= MAX_ATTEMPTS) {
    db.prepare('UPDATE staff SET failed_attempts = 0, locked_until = ? WHERE id = ?').run(inMs(LOCK_MINUTES * 60000), staff.id);
    audit(db, staff.id, 'login_locked', null, { minutes: LOCK_MINUTES });
    return 'locked';
  }
  db.prepare('UPDATE staff SET failed_attempts = ? WHERE id = ?').run(attempts, staff.id);
  return 'bad';
}

function createSession(db, staffId) {
  const token = newToken();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());   // заодно убираем просроченные
  db.prepare('INSERT INTO sessions (token_hash, staff_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), staffId, inMs(SESSION_HOURS * 3600000));
  return token;
}

// Вход. Возвращает { ok: true, token } или { ok: false, code: 'bad' | 'locked', retryAfterSec? }
export function login(db, loginName, pin) {
  const staff = db.prepare('SELECT id, pin_hash, failed_attempts, locked_until, is_active FROM staff WHERE login = ?').get(String(loginName ?? ''));
  if (!staff || !staff.is_active) {
    verifyPin(validPin(pin) ? pin : '000000', DUMMY_HASH);
    return { ok: false, code: 'bad' };
  }
  const res = tryPin(db, staff, pin);
  if (res === 'locked') {
    const fresh = db.prepare('SELECT locked_until FROM staff WHERE id = ?').get(staff.id);
    return { ok: false, code: 'locked', retryAfterSec: Math.max(1, Math.ceil((Date.parse(fresh.locked_until) - Date.now()) / 1000)) };
  }
  if (res === 'bad') return { ok: false, code: 'bad' };
  audit(db, staff.id, 'login');
  return { ok: true, token: createSession(db, staff.id) };
}

export function logout(db, token) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

// Кто это по номеру пропуска? Права читаются из базы каждый раз, поэтому изменения прав действуют сразу.
export function getUserByToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT s.id, s.login, s.full_name, s.must_change_pin, s.shop_id, sh.name AS shop_name,
           r.id AS role_id, r.code AS role_code, r.name AS role_name
      FROM sessions x
      JOIN staff s ON s.id = x.staff_id
      JOIN roles r ON r.id = s.role_id
      LEFT JOIN shops sh ON sh.id = s.shop_id
     WHERE x.token_hash = ? AND x.expires_at > ? AND s.is_active = 1`).get(hashToken(token), nowIso());
  if (!row) return null;
  const permissions = {};
  for (const p of db.prepare('SELECT permission_code, scope, mode, limit_kopecks FROM role_permissions WHERE role_id = ?').all(row.role_id)) {
    permissions[p.permission_code] = { scope: p.scope, mode: p.mode, limitKopecks: p.limit_kopecks };
  }
  return {
    id: row.id, login: row.login, fullName: row.full_name, mustChangePin: row.must_change_pin === 1,
    role: { code: row.role_code, name: row.role_name },
    shop: row.shop_id ? { id: row.shop_id, name: row.shop_name } : null,
    permissions,
  };
}

// Есть ли у человека право? Возвращает описание права (область, режим, предел) или null.
// write: true означает «нужно менять», тогда право «только смотреть» не подходит.
export function can(user, code, { write = false } = {}) {
  const grant = user?.permissions?.[code];
  if (!grant) return null;
  if (write && grant.mode === 'view') return null;
  return grant;
}

// Смена ПИН самим человеком. Неверный текущий ПИН тоже считается неверной попыткой.
export function changePin(db, staffId, currentPin, newPin, keepToken) {
  const staff = db.prepare('SELECT id, pin_hash, failed_attempts, locked_until FROM staff WHERE id = ?').get(staffId);
  if (!validPin(newPin)) return { ok: false, code: 'invalid_pin' };
  const res = tryPin(db, staff, currentPin);
  if (res !== 'ok') return { ok: false, code: res };
  if (newPin === currentPin) return { ok: false, code: 'same_pin' };
  db.prepare('UPDATE staff SET pin_hash = ?, must_change_pin = 0 WHERE id = ?').run(hashPin(newPin), staffId);
  db.prepare('DELETE FROM sessions WHERE staff_id = ? AND token_hash != ?').run(staffId, hashToken(keepToken));  // с других устройств выкидывает
  audit(db, staffId, 'pin_changed');
  return { ok: true };
}

// Новый сотрудник (делает владелец). Возвращает временный ПИН: показывается один раз, в базе только хэш.
export function createStaff(db, actor, { login: loginName, fullName, phone, roleCode, shopId }) {
  if (typeof loginName !== 'string' || !/^[a-z0-9._-]{3,32}$/i.test(loginName)) return { ok: false, code: 'bad_login' };
  if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 100) return { ok: false, code: 'bad_name' };
  const role = db.prepare('SELECT id FROM roles WHERE code = ?').get(String(roleCode ?? ''));
  if (!role) return { ok: false, code: 'bad_role' };
  if (shopId != null && !db.prepare('SELECT 1 FROM shops WHERE id = ? AND is_active = 1').get(shopId)) return { ok: false, code: 'bad_shop' };
  const tempPin = randomPin();
  try {
    const res = db.prepare('INSERT INTO staff (login, full_name, phone, role_id, shop_id, pin_hash, must_change_pin) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(loginName, fullName.trim(), phone ? String(phone).slice(0, 30) : null, role.id, shopId ?? null, hashPin(tempPin));
    audit(db, actor.id, 'staff_created', `staff:${res.lastInsertRowid}`, { login: loginName, role: roleCode });
    return { ok: true, id: Number(res.lastInsertRowid), login: loginName, tempPin };
  } catch (err) {
    if (/UNIQUE/i.test(err.message)) return { ok: false, code: 'login_taken' };
    throw err;
  }
}

// «Уволить»: не удаляем, а помечаем; все его пропуска удаляются, телефон сразу выбрасывает его из системы.
export function dismissStaff(db, actor, staffId) {
  const target = db.prepare('SELECT s.id, s.is_active, r.code AS role_code FROM staff s JOIN roles r ON r.id = s.role_id WHERE s.id = ?').get(staffId);
  if (!target) return { ok: false, code: 'not_found' };
  if (target.id === actor.id) return { ok: false, code: 'self' };
  if (!target.is_active) return { ok: false, code: 'already' };
  if (target.role_code === 'owner') {
    const owners = db.prepare("SELECT count(*) AS n FROM staff s JOIN roles r ON r.id = s.role_id WHERE r.code = 'owner' AND s.is_active = 1").get().n;
    if (owners <= 1) return { ok: false, code: 'last_owner' };
  }
  db.prepare('UPDATE staff SET is_active = 0 WHERE id = ?').run(staffId);
  db.prepare('DELETE FROM sessions WHERE staff_id = ?').run(staffId);
  audit(db, actor.id, 'staff_dismissed', `staff:${staffId}`);
  return { ok: true };
}
