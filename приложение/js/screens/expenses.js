// ▪ Файл js/screens/expenses.js: экраны «Расходы»: журнал и добавление. Подключается в index.html по порядку.
// ----- Расходы (ТЗ 7.4). Владелец вносит, бухгалтер смотрит и выгружает. Зарплата и доставка записываются сами -----
function expensesHtml() {
  var owner = st.role === 'Владелец', all = expAll(), total = REP.exp, cats = REP.cats, max = cats.length ? cats[0][1] : 1;
  var hero = heroTile('Расходы за <span class="num">30</span> дней', money(total), numSp(all.length) + ' ' + plural(all.length, 'запись', 'записи', 'записей'));
  var add = owner ? '<button class="btn btn-main" data-go="expense-new"><svg class="ic"><use href="#i-plus"/></svg>Добавить расход</button>' : '';
  var due = all.filter(function (e) { return e.cat === 'Аренда'; }).map(function (e) { return { n: e.n, amt: e.amt, left: 31 - e.ago, at: dateOf(e.ago - 31) }; }).sort(function (a, b) { return a.left - b.left; });
  var dueBlock = due.length ? '<div>' + secH('Ближайшие платежи', money(sum(due.map(function (d) { return d.amt; })))) + due.map(function (d) {
    return '<div class="rowline"><span>' + d.n + '<span class="t-label" style="display:block">' + d.at + ' / через ' + numSp(d.left) + ' ' + plural(d.left, 'день', 'дня', 'дней') + '</span></span><b class="num">' + money(d.amt) + '</b></div>';
  }).join('') + '</div>' : '';
  var catRows = cats.map(function (c) {
    var cnt = all.filter(function (e) { return e.cat === c[0]; }).length;
    return '<div class="rep-shop"><div class="h"><b>' + c[0] + '</b><span class="v">' + money(c[1]) + '</span></div><div class="rep-bar"><i class="rep-acc" style="width:' + Math.round(100 * c[1] / max) + '%"></i></div>' +
      '<div class="t-label">' + numSp(Math.round(100 * c[1] / total) + '%') + ' расходов / ' + (EXP_AUTO[c[0]] || numSp(cnt) + ' ' + plural(cnt, 'запись', 'записи', 'записей')) + '</div></div>';
  }).join('');
  var rows = all.slice().sort(function (a, b) { return a.ago - b.ago || (a.by === 'авто') - (b.by === 'авто') || b.id - a.id; }).filter(function (e) { return st.expCat === 'Все' || e.cat === st.expCat; });
  var ledger = '<div style="display:grid;gap:var(--s3)">' + secH('Записи', numSp(rows.length)) + chipsOf('data-expcat', [['Все', 'Все']].concat(cats.map(function (c) { return [c[0], c[0]]; })), st.expCat) +
    '<div>' + rows.map(function (e) { return '<div class="ln"><span class="name">' + e.n + '</span><span class="qty">' + money(e.amt) + '</span><span class="meta">' + dateOf(e.ago) + ' / ' + e.cat + ' / ' + e.by + '</span></div>'; }).join('') + '</div></div>';
  return '<section class="scr">' + titleSub('Расходы', 'Весь бизнес / последние ' + numSp(30) + ' дней') + flashHtml() +
    '<div class="cols"><div class="scr">' + hero + add + dueBlock + '<div>' + secH('По статьям') + catRows + '</div></div><div class="scr">' + ledger + stubBtn('btn-second', 'i-download', 'Выгрузить в Excel', XLSX_MSG) + '</div></div></section>';
}
function expenseNewHtml() {
  var x = st.expNew, ok = +digitsOf(x.amt) > 0 && x.cat;
  return '<section class="scr narrow">' + backTo('expenses', 'Расходы', 'Назад к расходам') + '<div class="t-h1">Новый расход</div>' +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Статья</span>' + chipsOf('data-expnewcat', EXP_MANUAL.map(function (c) { return [c, c]; }), x.cat) + '</div>' +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Сколько заплатили</span><label class="big-in"><input id="expamt" data-in="expamt" inputmode="numeric" placeholder="0" value="' + spacedNum(x.amt) + '" aria-label="Сумма расхода" autocomplete="off"><span class="cur">₽</span></label></div>' +
    lblInput('За что (по желанию)', 'expnote', x.note, 'Например, свет за октябрь', ' maxlength="40"') +
    '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Зарплата и доставка записываются сами, вручную их вносить не нужно. Аренда задаётся один раз с датами.</span></div>' +
    '<button class="btn btn-main" data-expsave' + disabledIf(ok) + '>Записать расход</button></section>';
}

