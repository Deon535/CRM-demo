// ▪ Файл js/helpers.js: общие мелочи для всех экранов: заголовки, чипы, кнопки-заглушки, плашка, склонение слов. Подключается в index.html по порядку.
// ===== Шаг 2.4: общие кирпичики, расходы, клиенты, продажа с клиентом, люди, настройки =====
var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
var numSp = function (v) { return '<span class="num">' + v + '</span>'; };
var backTo = function (screen, label, aria) { return '<div class="top-row"><button class="iconbtn" data-go="' + screen + '" aria-label="' + aria + '"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">' + label + '</span></div>'; };
var titleSub = function (title, sub) { return '<div><div class="t-h1">' + title + '</div>' + (sub ? '<div class="t-label" style="margin-top:6px">' + sub + '</div>' : '') + '</div>'; };
var secH = function (title, right) { return '<div class="sec-h"><span class="t-h2">' + title + '</span>' + (right ? '<span class="t-label">' + right + '</span>' : '') + '</div>'; };
var heroTile = function (label, val, foot) { return '<div class="tile inv"><span class="t-label">' + label + '</span><span class="tile-hero-num">' + val + '</span><span class="t-label">' + foot + '</span></div>'; };
var stubBtn = function (cls, icon, label, msg) { return '<button class="btn ' + cls + '" data-stub="' + esc(msg) + '">' + (icon ? '<svg class="ic"><use href="#' + icon + '"/></svg>' : '') + label + '</button>'; };
var XLSX_MSG = 'Демо: файл не создаётся. В настоящей системе здесь скачается таблица Excel.';
// ряд чипов: items это пары [значение, подпись]; eq: равные колонки в одну строку (t4: четыре в ряд, на узком экране два), иначе перенос на новую
var chipsOf = function (attr, items, cur, eq) { return '<div class="fchips ' + (eq ? 'eq' : 'wrap') + (eq === 't4' ? ' t4' : '') + '"' + (eq ? ' style="--n:' + items.length + '"' : '') + '>' + items.map(function (x) { return '<button class="fchip" ' + attr + '="' + x[0] + '" aria-pressed="' + (x[0] === cur) + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
var limitText = function () { return st.role === 'Владелец' ? 'без ограничений' : 'до ' + (st.role === 'Старший продавец' ? st.rules.discSenior : st.rules.discSeller) + '%'; };
var lblInput = function (label, id, val, ph, extra) { return '<label class="lbl">' + label + '<input class="inp" id="' + id + '" data-in="' + id + '" value="' + esc(val) + '" placeholder="' + ph + '" autocomplete="off"' + (extra || '') + '></label>'; };
var phoneDigits = function (raw) { var d = digitsOf(raw); return d.length === 11 && /^[78]/.test(d) ? d.slice(1) : d; };
var fmtPhone = function (raw) { var d = phoneDigits(raw); return d.length === 10 ? '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8) : String(raw).trim(); };
var disabledIf = function (ok) { return ok ? '' : ' style="opacity:.4"'; };

function flashHtml() { return st.flash ? '<div class="notice good"><svg class="ic"><use href="#i-check"/></svg><span>' + st.flash + '</span></div>' : ''; }
function backRow(label) { return '<div class="top-row"><button class="iconbtn" data-go="transfers" aria-label="Назад к списку"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">' + label + '</span></div>'; }
function plural(n, a, b, c) { var m = n % 10, h = n % 100; return h >= 11 && h <= 14 ? c : m === 1 ? a : m >= 2 && m <= 4 ? b : c; }
