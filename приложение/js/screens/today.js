// ▪ Файл js/screens/today.js: экран «Сегодня» для каждой роли (плитки). Подключается в index.html по порядку.
// ===== «Сегодня» каждой роли: плитки из образца «Модульная сетка». Числа сходятся между ролями (см. design-system.md) =====
var tHero = function (label, val, foot) { return '<div class="tile inv hero s2" style="min-height:150px"><span class="t-label">' + label + '</span><span class="tile-hero-num">' + val + '</span><span class="t-label">' + foot + '</span></div>'; };
var tMid = function (label, val) { return '<div class="tile"><span class="t-label">' + label + '</span><span class="t-mid">' + val + '</span></div>'; };
var tBad = function (label, val) { return '<div class="tile bad s2"><span class="t-label" style="color:inherit">' + label + '</span><span class="t-big">' + val + '</span></div>'; };
var tList = function (label, rows) { return '<div class="tile s2"><span class="t-label">' + label + '</span><div>' + rows + '</div></div>'; };
var tiles = function () { return '<div class="tiles">' + Array.prototype.join.call(arguments, '') + '</div>'; };
var sellerRow = function (name, val) { return '<div class="rowline"><span>' + name + '</span><span class="t-seller">' + val + '</span></div>'; };
function lowStock(shop) {
  var si = SHOPS.indexOf(shop), rows = '';
  DATA.forEach(function (d) {
    var n = sum(d.rows[si]);
    if (n <= 2) rows += '<div class="rowline"><span>' + d.n + '</span>' + (n === 0 ? '<span class="chip chip-neutral">нет в наличии</span>' : '<span class="chip chip-bad">осталось <span class="num">' + n + '</span></span>') + '</div>';
  });
  return rows || '<div class="t-label">Всё в достатке</div>';
}
function homeHtml() {
  var c = cfg();
  if (st.role === 'Владелец') return todayHtml.replace(/<div class="tile bad s2">[\s\S]*?<\/div>/, cashTile(null)).replace('{{profit}}', money(REP.profit)).replace('{{debt}}', money(DEBT));
  if (st.role === 'Старший продавец') return tiles(
    tHero('Выручка ' + c.shop + ' сегодня', money(84700), '<span class="num">12</span> чеков'),
    tMid('Возврат ждёт подтверждения', '1 / ' + money(4990)),
    tMid('Перемещение к приёму', String(trFilter('in').length)),
    cashTile(c.shop),
    tList('Продавцы смены', sellerRow('Заур', money(58600)) + sellerRow('Мурад', money(26100))),
    tList('Заканчивается в ' + c.shopIn, lowStock(c.shop)));
  if (st.role === 'Продавец') return tiles(
    tHero('Мои продажи за смену', money(49300), '<span class="num">9</span> чеков / ' + c.shop),
    tMid('Мои брони', String(2 + st.holdN)),
    tMid('Средний чек', money(5478)),
    tList('Заканчивается в ' + c.shopIn, lowStock(c.shop)));
  if (st.role === 'Онлайн-менеджер') {
    var oc = function (x) { return st.ord.filter(function (o) { return x.indexOf(o.st) >= 0; }).length; }, no = oc(['no']);
    return tiles(
      tHero('Новые заказы', String(oc(['new', 'chat'])), 'ждут ответа'),
      tMid('Ждут отправки', String(oc(['paid']))),
      tMid('В пути', String(oc(['way']))),
      tBad('Отказы за 7 дней', no + ' ' + plural(no, 'заказ', 'заказа', 'заказов'))) + ordersListHtml();
  }
  if (st.role === 'Курьер') return courierHtml();
  return tiles(
    tHero('Выручка сегодня', money(343400), 'по всей сети'),
    tMid('Расходы за 30 дней', money(REP.exp)),
    tMid('Долги поставщикам', money(DEBT)),
    cashTile(null),
    tMid('Возвраты', '3 / ' + money(12480)),
    tMid('Обмены / брак', '2 / 1'));
}
