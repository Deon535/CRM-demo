// ▪ Файл js/screens/cash.js: экраны «Касса» и закрытие смены. Подключается в index.html по порядку.
// ===== Касса и смена (веер 8) =====
var SH_REASONS = ['Ошиблись со сдачей', 'Выдача не записана', 'Причина неизвестна'];
var SC_KINDS = ['Хозрасходы', 'Передано Руслану', 'Передано Магомеду', 'Другое'];
var digitsOf = function (s) { return String(s || '').replace(/\D/g, ''); };
var spacedNum = function (s) { var d = digitsOf(s); return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''; };
var plusMoney = function (n) { return (n > 0 ? '+' : '') + money(n); };
var shOut = function (s) { return s.outs.reduce(function (a, o) { return a + o[1]; }, 0); };
var shExpected = function (s) { return s.start + s.sales1 + s.sales2 - shOut(s); };
var shDiff = function (s) { return s.counted - shExpected(s); };
var shById = function (id) { return st.shifts.filter(function (s) { return s.id === id; })[0]; };
// Плитка «Касса» на «Сегодня»: непогашенные расхождения сегодняшних смен (shop = null: по всей сети)
function cashTile(shop) {
  var bad = st.shifts.filter(function (s) { return s.day === 'Сегодня' && shDiff(s) !== 0 && !s.reason && (!shop || s.shop === shop); });
  if (!bad.length) return '<div class="tile s2"><span class="t-label">Касса' + (shop ? ' ' + shop : '') + '</span><span class="t-big">Сходится</span></div>';
  var sum = bad.reduce(function (a, s) { return a + shDiff(s); }, 0);
  return tBad(bad.length === 1 ? 'Касса ' + bad[0].shop : 'Касса: расхождений ' + bad.length, money(sum));
}
function shiftChip(s) {
  var d = shDiff(s);
  return d === 0 ? '<span class="chip chip-good">сошлось</span>' : s.reason ? '<span class="chip chip-neutral">разобрано</span>' : '<span class="chip chip-bad">' + money(d) + '</span>';
}
function shiftLedger(s) {
  var ev = [{ t: '09:00', tx: 'Начало смены', sub: 'остаток в кассе', amt: s.start }];
  s.outs.forEach(function (o) { ev.push({ t: o[2], tx: 'Выдано: ' + o[0].toLowerCase(), sub: /^Передано/.test(o[0]) ? o[3] + ' отдал, ' + o[0].replace('Передано ', '') + ' принял' : o[3], amt: -o[1] }); });
  ev.push({ t: '13:00', tx: 'Продажи наличными до 13:00', sub: '<span class="num">' + s.n1 + '</span> ' + plural(s.n1, 'чек', 'чека', 'чеков'), amt: s.sales1 });
  ev.push({ t: s.closed, tx: 'Продажи наличными после 13:00', sub: '<span class="num">' + s.n2 + '</span> ' + plural(s.n2, 'чек', 'чека', 'чеков'), amt: s.sales2 });
  ev.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
  var bal = 0;
  return ev.map(function (e, i) { bal += e.amt; return '<div class="led"><span class="tm">' + e.t + '</span><span class="tx">' + e.tx + '<span class="sub">' + e.sub + '</span></span><span class="amt' + (e.amt < 0 ? ' bad' : '') + '">' + (i === 0 ? money(e.amt) : plusMoney(e.amt)) + '</span><span class="bal">остаток ' + money(bal) + '</span></div>'; }).join('');
}

function cashHtml() {
  var c = cfg(), own = c.shop;
  if (st.role === 'Продавец') {
    var body = st.myClosed ? '<div class="done"><span class="okc"><svg class="ic"><use href="#i-check"/></svg></span><div class="t-h2">Смена закрыта</div><div class="t-label">Наличные записаны. Результат увидит старший продавец.</div></div>' :
      '<div class="dcard"><div class="dmini"><span class="ttl"><b>Смена открыта</b><span class="t-label">' + SELLER_SHIFT.shop + ' / с <span class="num">09:00</span></span></span><span class="chip chip-good">идёт</span></div><button class="btn btn-main" data-go="shift-close">Закрыть смену</button></div>';
    return '<section class="scr"><div class="t-h1">Касса</div>' + flashHtml() + body + '</section>';
  }
  var rows = st.shifts.filter(function (s) { return own ? s.shop === own : (st.shop === 'Все' || s.shop === st.shop); });
  var list = rows.length ? '<div>' + rows.map(function (s) {
    return '<button class="prow" data-shift="' + s.id + '"><span><b>' + s.shop + ' / ' + s.day + '</b><span class="sub">Закрыл ' + s.by + ', <span class="num">' + s.closed + '</span></span></span><span class="r"><span class="price">' + money(s.counted) + '</span>' + shiftChip(s) + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' : '<div class="empty"><svg class="ic"><use href="#i-wallet"/></svg><div class="t-h2">Смен пока нет</div><p>Закрытые смены появятся здесь.</p></div>';
  return '<section class="scr"><div class="t-h1">Касса</div>' + flashHtml() + '<div class="t-label">Закрытые смены: что насчитали в кассе</div>' + list + '</section>';
}

function shiftHtml() {
  var s = shById(st.shiftId), d = shDiff(s), c = cfg();
  var canResolve = st.role === 'Владелец' || (st.role === 'Старший продавец' && s.shop === c.shop);
  var back = '<div class="top-row"><button class="iconbtn" data-go="cash" aria-label="Назад к списку"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">Касса</span></div>';
  var formula = '<div class="formula"><div class="frow"><span class="t-label">Ожидали</span><span class="v">' + money(shExpected(s)) + '</span></div><div class="frow"><span class="t-label">Насчитали</span><span class="v">' + money(s.counted) + '</span></div><div class="frow res"><span class="t-label">Разница</span><span class="v ' + (d === 0 ? 'good' : 'bad') + '">' + (d === 0 ? money(0) : plusMoney(d)) + '</span></div></div>';
  var resolve = '';
  if (d !== 0) {
    if (s.reason) resolve = '<div class="notice good"><svg class="ic"><use href="#i-check"/></svg><span>Разобрано: ' + s.reason.toLowerCase() + '. Запись в журнале.</span></div>';
    else if (canResolve) resolve = '<div style="display:grid;gap:var(--s2)"><div class="t-h2">Причина расхождения</div><div class="seg stack">' + SH_REASONS.map(function (r) { return '<button data-sreason="' + r + '" aria-pressed="' + (st.shReason === r) + '">' + r + '</button>'; }).join('') + '</div></div><button class="btn btn-main" data-sresolve' + (st.shReason ? '' : ' style="opacity:.4"') + '>Закрыть расхождение</button>';
    else resolve = '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Расхождение разберёт старший продавец.</span></div>';
  }
  return '<section class="scr">' + back + flashHtml() + '<div><div class="t-h1">' + s.shop + '</div><div class="t-label" style="margin-top:6px">' + s.day + ', смена закрыта в <span class="num">' + s.closed + '</span>, ' + s.by + '</div></div>' + formula +
    '<div><div class="sec-h"><span class="t-h2">Движение денег за смену</span></div>' + shiftLedger(s) + '</div>' + resolve + '</section>';
}

function shiftCloseHtml() {
  var sc = st.sc, back = '<div class="top-row"><button class="iconbtn" data-go="cash" aria-label="Назад"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">Касса</span></div>';
  var title = '<div><div class="t-h1">Закрытие смены</div><div class="t-label" style="margin-top:6px">' + SELLER_SHIFT.shop + ' / смена с <span class="num">09:00</span></div></div>';
  var bar = '<div class="prog p2">' + [1, 2].map(function (i) { return '<i class="' + (i <= sc.step ? 'on' : '') + '"></i>'; }).join('') + '</div><div class="t-label">Шаг <span class="num">' + sc.step + '</span> из <span class="num">2</span></div>';
  if (sc.step === 1) {
    var outs = sc.outs.length ? sc.outs.map(function (o) { return '<div class="rowline"><span><b>' + o[0] + '</b><span class="t-label" style="display:block"><span class="num">' + o[2] + '</span> / ' + o[3] + '</span></span><b class="num bad">' + money(-o[1]) + '</b></div>'; }).join('') : '<div class="t-label">Выдач из кассы не было.</div>';
    var tail;
    if (sc.add) {
      var okAdd = +digitsOf(sc.add.amt) > 0 && sc.add.kind;
      tail = '<div style="display:grid;gap:var(--s2)"><span class="t-label">Сколько выдали</span><label class="big-in"><input id="scadd" data-in="scadd" inputmode="numeric" placeholder="0" value="' + spacedNum(sc.add.amt) + '" autocomplete="off"><span class="cur">₽</span></label></div>' +
        '<div class="seg stack">' + SC_KINDS.map(function (k) { return '<button data-sckind="' + k + '" aria-pressed="' + (sc.add.kind === k) + '">' + k + '</button>'; }).join('') + '</div>' +
        '<button class="btn btn-main" data-scaddsave' + (okAdd ? '' : ' style="opacity:.4"') + '>Записать выдачу</button><button class="linkbtn" style="justify-self:center" data-scaddcancel>Отмена</button>';
    } else tail = '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Всё, что вы брали из кассы сегодня, записано? Неучтённая выдача даст расхождение.</span></div><button class="btn btn-main" data-scstep="1">Да, всё записано</button><button class="btn btn-second" data-scadd>Добавить выдачу</button>';
    return '<section class="scr">' + back + title + bar + '<div class="t-h2">Выдачи из кассы за смену</div><div>' + outs + '</div>' + tail + '</section>';
  }
  var ok = +digitsOf(sc.amt) > 0;
  return '<section class="scr">' + back + title + bar + '<div class="t-h2">Наличные в кассе</div><label class="big-in"><input id="scamt" data-in="scamt" inputmode="numeric" placeholder="0" value="' + spacedNum(sc.amt) + '" aria-label="Сколько наличных в кассе" autocomplete="off"><span class="cur">₽</span></label>' +
    '<div class="t-label">Пересчитайте всё, вместе с мелочью. Результат увидит старший продавец.</div><button class="btn btn-main" data-scclose' + (ok ? '' : ' style="opacity:.4"') + '>Закрыть смену</button><button class="linkbtn" style="justify-self:center" data-scstep="-1">Назад</button></section>';
}

