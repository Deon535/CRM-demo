// ▪ Файл js/login.js: окно входа при работе с сервером (логин и ПИН, смена временного ПИН, выход).
// Без сервера окно работает как раньше: выбор роли без ПИН. Подключается в index.html по порядку.

// В каком состоянии окно: demo (нет сервера), login (нужно войти), newpin (надо сменить временный ПИН), who (вошли)
function loginMode() {
  if (!SERVER.on) return 'demo';
  if (!SERVER.user) return 'login';
  return SERVER.user.mustChangePin ? 'newpin' : 'who';
}
// Окно можно закрыть, только если вход не требуется
function loginClosable() { var m = loginMode(); return m === 'demo' || m === 'who'; }

function loginError(text) { $('loginErr').textContent = text; $('loginErr').hidden = !text; }
function clearLoginFields() { ['inLogin', 'inPin', 'inPinOld', 'inPin2'].forEach(function (id) { $(id).value = ''; }); }

// Показать в окне только то, что нужно в текущем состоянии
function renderLoginMode() {
  var m = loginMode();
  var on = function (id, v) { $(id).hidden = !v; };
  on('lblLogin', m === 'demo' || m === 'login');
  on('lblPinOld', m === 'newpin');
  on('lblPin', m !== 'who');
  on('lblPin2', m === 'newpin');
  on('rpBox', m === 'demo');
  on('loginWho', m === 'who');
  on('doLogin', m !== 'who');
  on('doLogout', m === 'who' || m === 'newpin');
  loginError('');
  $('loginHint').hidden = m === 'who';
  $('loginHint').textContent = { demo: 'В демо пароль не нужен, роль можно сменить без выхода.', login: 'Войдите по логину и ПИН. Их выдаёт владелец.', newpin: 'Это временный ПИН. Придумайте свой: от 4 до 6 цифр.', who: '' }[m];
  $('lblPinText').textContent = m === 'newpin' ? 'Новый ПИН' : (m === 'demo' ? 'Пароль' : 'ПИН');
  $('inPin').placeholder = m === 'demo' ? 'В демо не нужен' : '';
  if (m === 'demo') $('inPin').removeAttribute('maxlength'); else $('inPin').setAttribute('maxlength', '6');
  $('doLogin').textContent = m === 'newpin' ? 'Сохранить ПИН' : 'Войти';
  if (m === 'who') {
    $('whoName').textContent = SERVER.user.fullName;
    $('whoRole').textContent = SERVER.user.role.name + (SERVER.user.shop ? ', ' + SERVER.user.shop.name : '');
  }
}

// Человек вошёл: ставим его роль из ответа сервера и показываем приложение
function enterAs(user) {
  SERVER.user = user;
  if (user.mustChangePin) { renderLoginMode(); openLogin(true); return; }
  if (!ROLE[user.role.name]) {   // для такой роли в приложении ещё нет меню и экранов
    apiCall('POST', '/api/logout').then(function () {
      SERVER.user = null; renderLoginMode(); openLogin(true);
      loginError('Для роли «' + user.role.name + '» в приложении пока нет экранов.');
    });
    return;
  }
  var keep = { w: st.w, t: st.t, sb: st.sb };
  st = init(); st.w = keep.w; st.t = keep.t; st.sb = keep.sb;   // чистое состояние для нового человека
  st.role = user.role.name; st.screen = cfg().home; st.prev = st.screen;
  document.documentElement.classList.remove('locked');
  openLogin(false);
  render();
}

// Кнопка «Войти» (или «Сохранить ПИН») при работе с сервером
function submitLogin() {
  var m = loginMode();
  var btn = $('doLogin');
  var done = function () { btn.disabled = false; };
  var fail = function () { done(); loginError('Нет связи с сервером. Попробуйте ещё раз.'); };
  var msg = function (r, fallback) { return r.status === 400 ? 'Проверьте введённые данные' : (r.data.error || fallback); };
  loginError('');
  if (m === 'login') {
    var login = $('inLogin').value.trim(), pin = $('inPin').value;
    if (!login || !pin) { loginError('Введите логин и ПИН'); return; }
    btn.disabled = true;
    apiCall('POST', '/api/login', { login: login, pin: pin }).then(function (r) {
      done();
      if (r.status === 200) { clearLoginFields(); enterAs(r.data.user); } else loginError(msg(r, 'Не удалось войти'));
    }).catch(fail);
  } else if (m === 'newpin') {
    var cur = $('inPinOld').value, a = $('inPin').value, b = $('inPin2').value;
    if (!cur || !a || !b) { loginError('Заполните все три поля'); return; }
    if (a !== b) { loginError('Новые ПИН не совпадают'); return; }
    btn.disabled = true;
    apiCall('POST', '/api/me/pin', { currentPin: cur, newPin: a }).then(function (r) {
      done();
      if (r.status === 200) { clearLoginFields(); SERVER.user.mustChangePin = false; enterAs(SERVER.user); } else loginError(msg(r, 'Не удалось сохранить ПИН'));
    }).catch(fail);
  }
}

// Выйти: сервер удаляет пропуск, экран прячет приложение и снова просит войти
function doLogout() {
  apiCall('POST', '/api/logout').then(function () {
    SERVER.user = null;
    var keep = { w: st.w, t: st.t, sb: st.sb };
    st = init(); st.w = keep.w; st.t = keep.t; st.sb = keep.sb;
    clearLoginFields();
    document.documentElement.classList.add('locked');
    render(); renderLoginMode(); openLogin(true);
  });
}

// При запуске: есть ли сервер, и если есть, вошёл ли уже человек (пропуск живёт 12 часов)
function serverInit() {
  var html = document.documentElement;
  serverProbe().then(function (on) {
    SERVER.on = on;
    if (!on) { html.classList.remove('locked'); return; }
    return apiCall('GET', '/api/me').then(function (r) {
      if (r.status === 200) enterAs(r.data.user); else { renderLoginMode(); openLogin(true); }
    });
  }).catch(function () { html.classList.remove('locked'); });
}
