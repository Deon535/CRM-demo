// ▪ Файл js/api.js: разговор экрана с сервером (адреса /api/...). Подключается в index.html по порядку.
// SERVER.on: есть ли сервер (страница открыта по http и сервер отвечает). Если нет (двойной щелчок по index.html), экран работает как демо.
var SERVER = { on: false, user: null };

// Задать серверу вопрос. Возвращает { status: код ответа, data: ответ }. Пропуск (cookie) браузер прикладывает сам.
function apiCall(method, path, body) {
  return fetch(path, {
    method: method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data }; });
  });
}

// Есть ли сервер? Спрашиваем адрес «жив ли сервер»
function serverProbe() {
  if (!/^https?:$/.test(location.protocol)) return Promise.resolve(false);
  return apiCall('GET', '/api/health').then(function (r) { return r.status === 200 && r.data.ok === true; }).catch(function () { return false; });
}
