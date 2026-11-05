// ▪ Файл js/main.js: запуск. Подключается в index.html по порядку.
// Два режима страницы:
//   приложение (по умолчанию): на всё окно, вид «телефон» или «компьютер» выбирается по ширине окна, тема как на устройстве;
//   витрина (адрес index.html?витрина): рамка и кнопки «Телефон / Компьютер / Тема» сверху, как было при выборе дизайна.
var queryText = ''; try { queryText = decodeURIComponent(location.search); } catch (e) { queryText = location.search; }
var SHOWCASE = /(^|[?&])(витрина|showcase)/i.test(queryText);
document.documentElement.classList.toggle('showcase', SHOWCASE);
var DESK_FROM = 900;   // от этой ширины окна (в пикселях) показываем вид «компьютер», уже окна: «телефон»
var layoutByWidth = function () { return window.innerWidth >= DESK_FROM ? 'desk' : 'phone'; };
if (!SHOWCASE) {
  st.w = layoutByWidth();
  st.t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  window.addEventListener('resize', function () { var w = layoutByWidth(); if (st.w !== w) { st.w = w; render(); } });   // окно изменили, и вид сменился сам
}
// Открыто с сервера (http): пока не узнали, вошёл ли человек (serverInit), содержимое скрыто, чтобы оно не мелькнуло
if (/^https?:$/.test(location.protocol)) document.documentElement.classList.add('locked');
render(); renderRoles();
serverInit();
