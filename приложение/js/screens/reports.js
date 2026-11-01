// ▪ Файл js/screens/reports.js: экран «Отчёты» и расчёт прибыли (repRebuild). Подключается в index.html по порядку.
// ===== Отчёты: прибыль за последние 30 дней (веер 9). Данные придуманы для демо. Плитки «Сегодня» (прибыль, расходы, долги) берут цифры отсюда =====
// Данные отчёта считаются из журнала расходов и зарплаты (expAll; пересчитывает repRebuild в начале каждой отрисовки): изменили процент, добавили расход, и прибыль пересчиталась везде
var REP = null;
function repRebuild() {
  var all = expAll(), direct = {}, cats = {}, total = 0, shared = 0;
  all.forEach(function (e) { total += e.amt; cats[e.cat] = (cats[e.cat] || 0) + e.amt; if (SHOPS.indexOf(e.shop) >= 0) direct[e.shop] = (direct[e.shop] || 0) + e.amt; else shared += e.amt; });
  var shops = SHOP_BASE.map(function (x) { return { n: x[0], rev: x[1], cogs: x[2] }; });
  var rev = sum(shops.map(function (s) { return s.rev; })), cogs = sum(shops.map(function (s) { return s.cogs; }));
  shops.forEach(function (s) { s.exp = (direct[s.n] || 0) + Math.round(shared * s.rev / rev); });
  shops[0].exp += total - sum(shops.map(function (s) { return s.exp; }));   // округление не должно менять итог
  shops.forEach(function (s) { s.profit = s.rev - s.cogs - s.exp; s.margin = Math.round(100 * s.profit / s.rev); s.mx = s.profit / s.rev; });
  REP = { shops: shops, rev: rev, cogs: cogs, exp: total, profit: rev - cogs - total, cats: EXP_ORDER.filter(function (c) { return cats[c]; }).map(function (c) { return [c, cats[c]]; }).sort(function (x, y) { return y[1] - x[1]; }) };
}
var DEBT = 310000;
// бухгалтер итоговую прибыль и маржу не видит (допущение, уточнить с Магомедом)
var REP_SORTS = { 'Владелец': [['profit', 'По прибыли'], ['rev', 'По выручке'], ['margin', 'По марже']], 'Бухгалтер': [['rev', 'По выручке'], ['exp', 'По расходам']] };
var repPct = function (a) { return Math.round(100 * a / REP.rev); };
function repSortKey() { var list = REP_SORTS[st.role]; return list.some(function (x) { return x[0] === st.rsort; }) ? st.rsort : list[0][0]; }
function repShopRow(s, key, max, owner) {
  var n = function (v) { return '<span class="num">' + money(v) + '</span>'; }, mg = '<span class="num">' + s.margin + '%</span>';
  var shown = key === 'margin' ? mg : money(s[key]), main = key === 'margin' ? s.mx : s[key];
  // в подписи показываем остальные числа, а не то, по которому идёт сортировка
  var sub = owner
    ? (key === 'profit' ? 'выручка ' + n(s.rev) + ' / маржа ' + mg : key === 'rev' ? 'прибыль ' + n(s.profit) + ' / маржа ' + mg : 'выручка ' + n(s.rev) + ' / прибыль ' + n(s.profit))
    : (key === 'rev' ? 'закупка ' + n(s.cogs) + ' / расходы ' + n(s.exp) : 'выручка ' + n(s.rev) + ' / закупка ' + n(s.cogs));
  return '<div class="rep-shop"><div class="h"><b>' + s.n + '</b><span class="v">' + shown + '</span></div><div class="rep-bar"><i class="rep-acc" style="width:' + Math.round(100 * main / max) + '%"></i></div><div class="t-label">' + sub + '</div></div>';
}
function reportsHtml() {
  var owner = st.role === 'Владелец', key = repSortKey(), sorts = REP_SORTS[st.role];
  var list = REP.shops.slice().sort(function (a, b) { return key === 'margin' ? b.mx - a.mx : b[key] - a[key]; });
  var max = Math.max.apply(null, list.map(function (s) { return key === 'margin' ? s.mx : s[key]; }));
  var pc = repPct(REP.cogs), pe = repPct(REP.exp), pp = 100 - pc - pe;
  var leg = function (cls, label, p, v) { return '<div class="rep-leg"><span class="sw ' + cls + '"></span><span>' + label + '</span><span class="pc">' + p + '%</span><span class="am">' + money(v) + '</span></div>'; };
  var hundred = '<div style="display:grid;gap:var(--s3)"><div class="t-h2">С каждых <span class="num">100 ₽</span> выручки остаётся <span class="num good">' + pp + ' ₽</span></div>' +
    '<div class="rep-stack"><i class="rep-mut" style="width:' + pc + '%"></i><i class="rep-acc" style="width:' + pe + '%"></i><i class="rep-good" style="width:' + pp + '%"></i></div>' +
    '<div>' + leg('rep-mut', 'Закупка проданного', pc, REP.cogs) + leg('rep-acc', 'Расходы', pe, REP.exp) + leg('rep-good', 'Прибыль', pp, REP.profit) + '</div></div>';
  var hero = owner
    ? '<div class="tile inv"><span class="t-label">Прибыль за <span class="num">30</span> дней</span><span class="tile-hero-num">' + money(REP.profit) + '</span><span class="t-label">маржа <span class="num">' + repPct(REP.profit) + '%</span> от выручки</span></div>' + hundred
    : '<div class="tile inv"><span class="t-label">Выручка за <span class="num">30</span> дней</span><span class="tile-hero-num">' + money(REP.rev) + '</span><span class="t-label">по всей сети</span></div>' +
      '<div class="rep-two">' + tMid('Закупка проданного', money(REP.cogs)) + tMid('Расходы', money(REP.exp)) + '</div>';
  var cats = '<div><div class="sec-h"><span class="t-h2">Расходы по статьям</span><span class="t-label num">' + money(REP.exp) + '</span></div>' +
    REP.cats.map(function (c) { return '<div class="rowline"><span>' + c[0] + '</span><b class="num">' + money(c[1]) + '</b></div>'; }).join('') + '</div>';
  var chips = '<div class="fchips eq" style="--n:' + sorts.length + '">' + sorts.map(function (x) { return '<button class="fchip" data-rsort="' + x[0] + '" aria-pressed="' + (x[0] === key) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  var shops = '<div style="display:grid;gap:var(--s3)"><div class="sec-h"><span class="t-h2">По магазинам</span></div>' + chips + '<div>' + list.map(function (s) { return repShopRow(s, key, max, owner); }).join('') + '</div></div>';
  var note = '<div class="t-label">Закупка товара в расходы не входит: она уже в закупочной стоимости проданного. Долги поставщикам (<span class="num">' + money(DEBT) + '</span>) это отдельный отчёт.</div>';
  var btn = '<button class="btn btn-second" data-rexport><svg class="ic"><use href="#i-download"/></svg>Выгрузить в Excel</button>';
  return '<section class="scr"><div><div class="t-h1">Отчёты</div><div class="t-label" style="margin-top:6px">Весь бизнес / последние <span class="num">30</span> дней</div></div>' +
    '<div class="cols"><div class="scr">' + hero + cats + '</div><div class="scr">' + shops + note + flashHtml() + btn + '</div></div></section>';
}
