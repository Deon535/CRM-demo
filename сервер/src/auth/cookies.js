// ▪ Файл сервер/src/auth/cookies.js: чтение и запись cookie («кармашка» браузера), где лежит номер пропуска.
export const COOKIE_NAME = 'crm_session';

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* битая запись, пропускаем */ }
  }
  return out;
}

// HttpOnly: скрипты страницы не видят этот cookie. SameSite=Lax: чужие сайты не могут отправить его от вашего имени.
// Secure (только по HTTPS) включается на сервере переменной COOKIE_SECURE=1.
export function sessionCookie(token, maxAgeSec, secure) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
