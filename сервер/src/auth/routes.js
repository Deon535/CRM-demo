// ▪ Файл сервер/src/auth/routes.js: адреса API для входа и сотрудников + «охранники» (requireAuth, requirePermission) для всех остальных адресов.
import { COOKIE_NAME, parseCookies, sessionCookie } from './cookies.js';
import { SESSION_HOURS, login, logout, getUserByToken, can, changePin, createStaff, dismissStaff } from './auth.js';

// Охранник 1: нужен вход. Пока сотрудник не сменил временный ПИН, пускаем только на адреса с allowMustChangePin.
export async function requireAuth(req, reply) {
  if (!req.user) return reply.code(401).send({ error: 'Нужно войти', code: 'unauthorized' });
  if (req.user.mustChangePin && !req.routeOptions.config?.allowMustChangePin) {
    return reply.code(403).send({ error: 'Сначала смените временный ПИН', code: 'must_change_pin' });
  }
}

// Охранник 2: нужен вход и право (например, requirePermission('staff', { write: true })).
export function requirePermission(code, opts) {
  return async function (req, reply) {
    const denied = await requireAuth(req, reply);
    if (denied) return denied;
    if (!can(req.user, code, opts)) return reply.code(403).send({ error: 'Нет прав на это действие', code: 'forbidden' });
  };
}

const str = (maxLength) => ({ type: 'string', maxLength });
const keepAfterPinChange = { allowMustChangePin: true };

// Подключается к корню приложения, поэтому req.user доступен всем адресам, которые добавятся позже.
export function registerAuth(app, { db, secureCookies }) {
  app.decorateRequest('user', null);
  app.decorateRequest('token', null);

  // Для адресов /api/...: смотрим пропуск в cookie и узнаём, кто спрашивает
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/')) return;
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME] ?? null;
    req.token = token;
    req.user = getUserByToken(db, token);
  });

  app.post('/api/login', {
    schema: { body: { type: 'object', required: ['login', 'pin'], properties: { login: str(64), pin: str(16) } } },
  }, async (req, reply) => {
    const res = login(db, req.body.login, req.body.pin);
    if (!res.ok && res.code === 'locked') {
      return reply.code(429).header('Retry-After', res.retryAfterSec).send({
        error: `Слишком много неверных попыток. Повторите через ${Math.ceil(res.retryAfterSec / 60)} мин.`, code: 'locked', retryAfterSec: res.retryAfterSec,
      });
    }
    if (!res.ok) return reply.code(401).send({ error: 'Неверный логин или ПИН', code: 'bad_credentials' });
    reply.header('Set-Cookie', sessionCookie(res.token, SESSION_HOURS * 3600, secureCookies));
    return { ok: true, user: getUserByToken(db, res.token) };
  });

  app.post('/api/logout', { config: keepAfterPinChange, preHandler: requireAuth }, async (req, reply) => {
    logout(db, req.token);
    reply.header('Set-Cookie', sessionCookie('', 0, secureCookies));
    return { ok: true };
  });

  app.get('/api/me', { config: keepAfterPinChange, preHandler: requireAuth }, async (req) => ({ user: req.user }));

  app.post('/api/me/pin', {
    config: keepAfterPinChange,
    preHandler: requireAuth,
    schema: { body: { type: 'object', required: ['currentPin', 'newPin'], properties: { currentPin: str(16), newPin: str(16) } } },
  }, async (req, reply) => {
    const res = changePin(db, req.user.id, req.body.currentPin, req.body.newPin, req.token);
    if (res.ok) return { ok: true };
    if (res.code === 'invalid_pin') return reply.code(400).send({ error: 'ПИН должен состоять из 4–6 цифр', code: res.code });
    if (res.code === 'same_pin') return reply.code(400).send({ error: 'Новый ПИН должен отличаться от старого', code: res.code });
    if (res.code === 'locked') return reply.code(429).send({ error: 'Слишком много неверных попыток. Попробуйте позже.', code: res.code });
    return reply.code(401).send({ error: 'Неверный текущий ПИН', code: 'bad_credentials' });
  });

  // Создать сотрудника: только у кого есть право «Сотрудники» на изменение (владелец)
  app.post('/api/staff', {
    preHandler: requirePermission('staff', { write: true }),
    schema: { body: { type: 'object', required: ['login', 'fullName', 'roleCode'], properties: {
      login: str(32), fullName: str(100), phone: str(30), roleCode: str(32), shopId: { type: ['integer', 'null'] },
    } } },
  }, async (req, reply) => {
    const res = createStaff(db, req.user, req.body);
    if (res.ok) return { ok: true, id: res.id, login: res.login, tempPin: res.tempPin };
    const text = { bad_login: 'Логин: 3–32 символа, латинские буквы, цифры, точка, дефис, подчёркивание', bad_name: 'Укажите имя', bad_role: 'Такой роли нет', bad_shop: 'Такого магазина нет', login_taken: 'Такой логин уже занят' }[res.code];
    return reply.code(res.code === 'login_taken' ? 409 : 400).send({ error: text, code: res.code });
  });

  // «Уволить»: не удаляет, а помечает и сразу выкидывает человека из системы
  app.post('/api/staff/:id/dismiss', {
    preHandler: requirePermission('staff', { write: true }),
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } } } },
  }, async (req, reply) => {
    const res = dismissStaff(db, req.user, req.params.id);
    if (res.ok) return { ok: true };
    const map = { not_found: [404, 'Сотрудник не найден'], self: [400, 'Нельзя уволить самого себя'], already: [409, 'Уже уволен'], last_owner: [400, 'Нельзя уволить последнего владельца'] }[res.code];
    return reply.code(map[0]).send({ error: map[1], code: res.code });
  });
}
