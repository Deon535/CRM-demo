// ▪ Файл js/screens/people.js: экраны «Люди»: команда, график, зарплата, журнал, карточка сотрудника. Подключается в index.html по порядку.
// ----- Люди (ТЗ 8): команда, график, зарплата, журнал. Видит только владелец -----
function peopleHtml() {
  var tabs = [['staff', 'Команда'], ['sched', 'График'], ['pay', 'Зарплата'], ['log', 'Журнал']], body;
  if (st.pTab === 'pay') {
    var pays = staffPays(), n = function (v) { return numSp(money(v)); }, cost = sum(autoExp().filter(function (e) { return e.cat === 'Зарплата'; }).map(function (e) { return e.amt; }));
    var hero = heroTile('К выплате за <span class="num">30</span> дней', money(sum(pays.map(function (x) { return x.total; }))), numSp(st.staff.length) + ' ' + plural(st.staff.length, 'сотрудник', 'сотрудника', 'сотрудников') + ' / в расходах ' + numSp(money(cost)));
    var plans = '<div>' + secH('План магазинов', 'бонус ' + numSp(money(st.rules.bonus))) + SHOP_BASE.map(function (b) {
      var ok = b[1] >= PLANS[b[0]];
      return '<div class="rowline"><span>' + b[0] + '<span class="t-label" style="display:block">выручка ' + n(b[1]) + ' из ' + n(PLANS[b[0]]) + '</span></span>' + (ok ? '<span class="chip chip-good">выполнен</span>' : '<span class="chip chip-neutral">не хватает ' + numSp(money(PLANS[b[0]] - b[1])) + '</span>') + '</div>';
    }).join('') + '</div>';
    var list = '<div>' + secH('Расчёт по сотрудникам') + st.staff.map(function (p, i) {
      var x = pays[i];
      var f = 'оклад ' + n(p.salary) + (x.pct ? ' + ' + numSp(rateOf(p) + '%') + ' ' + n(x.pct) : '') + (x.bonus ? ' + бонус ' + n(x.bonus) : '') + (p.adv ? ' − аванс ' + n(p.adv) : '') + (p.fine ? ' − штраф ' + n(p.fine) : '');
      return '<button class="prow" data-person="' + p.id + '"><span><b>' + p.n + '</b><span class="sub">' + f + '</span></span><span class="r"><span class="price">' + money(x.total) + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
    }).join('') + '</div>';
    body = '<div class="cols"><div class="scr">' + hero + plans + '</div><div class="scr">' + list + '</div></div>';
  } else if (st.pTab === 'log') {
    var rows = st.log.filter(function (l) { return st.logF === 'Все' || l[3] === st.logF; });
    body = chipsOf('data-logf', LOG_TYPES, st.logF) + '<div>' + rows.map(function (l) { return '<div class="led"><span class="tm">' + l[1] + '</span><span class="tx">' + l[4] + '<span class="sub">' + l[2] + ' / ' + agoText(l[0]) + '</span></span></div>'; }).join('') + '</div>';
  } else if (st.pTab === 'sched') {
    body = schedHtml();
  } else {
    body = '<button class="btn btn-second" data-pnew><svg class="ic"><use href="#i-plus"/></svg>Новый сотрудник</button><div class="t-label">Сегодня работают ' + numSp(st.staff.filter(isOn).length) + ' из ' + numSp(st.staff.length) + '</div><div>' + st.staff.map(function (p) {
      return '<button class="prow" data-person="' + p.id + '"><span><b>' + p.n + '</b><span class="sub">' + p.role + ' / ' + shopOf(p) + '</span></span><span class="r"><span class="chip chip-' + (isOn(p) ? 'good' : 'neutral') + '">' + (isOn(p) ? 'работает' : 'выходной') + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
    }).join('') + '</div>';
  }
  return '<section class="scr">' + titleSub('Люди', 'Команда, график, зарплата и журнал') + chipsOf('data-ptab', tabs, st.pTab, 't4') + flashHtml() + body + '</section>';
}
// недельный график (ТЗ 8.3): неделя, день, у кого смена; красная плашка, если в магазине никого нет
function schedHtml() {
  var w = st.schWeek, d = st.schDay, ids = st.sched[w][d], ago = 6 - d - 7 * w;
  var dayChips = '<div class="fchips tabs" style="--n:7">' + DAYS.map(function (nm, i) { return '<button class="fchip" data-schday="' + i + '" aria-pressed="' + (i === d) + '">' + nm + ' <span class="num">' + dayNum(6 - i - 7 * w) + '</span></button>'; }).join('') + '</div>';
  var empty = SHOPS.filter(function (s) { return st.staff.some(function (p) { return p.shop === s; }) && !st.staff.some(function (p) { return p.shop === s && ids.indexOf(p.id) >= 0; }); });
  var warn = empty.map(function (s) { return '<div class="notice bad"><svg class="ic"><use href="#i-alert"/></svg><span>' + s + ': в этот день в магазине никого нет.</span></div>'; }).join('');
  var groups = SHOPS.concat(['Все']).filter(function (s) { return st.staff.some(function (p) { return p.shop === s; }); }).map(function (s) {
    var team = st.staff.filter(function (p) { return p.shop === s; }), on = team.filter(function (p) { return ids.indexOf(p.id) >= 0; }).length;
    return '<div>' + secH(s === 'Все' ? 'Онлайн и доставка' : s, numSp(on) + ' из ' + numSp(team.length)) + '<div class="togs" style="padding-top:var(--s3)">' + team.map(function (p) {
      var works = ids.indexOf(p.id) >= 0;
      return '<button class="tog multi" data-swork="' + p.id + '" aria-pressed="' + works + '"><span class="box"><svg class="ic"><use href="#i-check"/></svg></span><span><b>' + p.n + '</b><span class="sub">' + p.role + ' / ' + (works ? numSp('9:00–21:00') : 'выходной') + '</span></span></button>';
    }).join('') + '</div></div>';
  }).join('');
  return chipsOf('data-schweek', [[0, 'Эта неделя'], [1, 'Следующая']], w, true) + dayChips +
    '<div class="t-label">' + DAYS[d] + ', ' + dateOf(ago) + ': работают ' + numSp(ids.length) + ' из ' + numSp(st.staff.length) + '. Нажмите на имя, чтобы поставить или убрать смену.</div>' + warn + groups;
}
function personHtml() {
  var i = st.staff.map(function (p) { return p.id; }).indexOf(st.personId), p = st.staff[i], x = staffPays()[i], seller = isSeller(p), n = function (v) { return numSp(money(v)); };
  var hero = heroTile('К выплате за <span class="num">30</span> дней', money(x.total), 'оклад + процент + бонус − аванс − штраф');
  var line = function (l, v, bad) { return '<div class="rowline"><span class="t-label">' + l + '</span><b class="num' + (bad ? ' bad' : '') + '">' + v + '</b></div>'; };
  var calc = '<div>' + secH('Из чего складывается') + line('Оклад', money(p.salary)) + (seller ? line('Личные продажи', money(x.sales)) + line('Процент ' + rateOf(p) + '% от продаж', money(x.pct)) + line('Бонус за план магазина', x.plan ? money(x.bonus) : '0 ₽') : '') +
    line('Аванс', p.adv ? money(-p.adv) : '0 ₽', p.adv) + line('Штраф', p.fine ? money(-p.fine) : '0 ₽', p.fine) + '</div>' + (p.fine ? '<div class="t-label">Штраф за невыход без предупреждения.</div>' : '');
  var info = [['Роль', p.role], ['Магазин', shopOf(p)], ['Телефон', numSp(p.phone)], ['Возраст', p.age ? numSp(p.age) : '—'], ['В команде с', p.since], ['Оклад', n(p.salary)], ['Процент с продаж', seller ? numSp(rateOf(p) + '%') : 'нет'], ['Сегодня', isOn(p) ? 'работает' : 'выходной']];
  var data = '<div>' + secH('Данные') + info.map(function (r) { return '<div class="rowline"><span class="t-label">' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>';
  var acts = '<div class="dtwo even"><a class="btn btn-second" href="tel:' + p.phone.replace(/[^+\d]/g, '') + '"><svg class="ic"><use href="#i-phone"/></svg>Позвонить</a><button class="btn btn-second" data-pedit="' + p.id + '">Изменить</button></div>';
  var pm = st.pMoney, okm = +digitsOf(pm.amt) > 0;
  var money_ = '<div style="display:grid;gap:var(--s3)">' + secH('Аванс и штраф') + chipsOf('data-pmkind', [['adv', 'Аванс'], ['fine', 'Штраф']], pm.kind, true) +
    '<label class="big-in"><input id="pmamt" data-in="pmamt" inputmode="numeric" placeholder="0" value="' + spacedNum(pm.amt) + '" aria-label="Сумма" autocomplete="off"><span class="cur">₽</span></label>' +
    '<div class="t-label">' + (pm.kind === 'fine' ? 'Штраф только за невыход без предупреждения. Он уменьшает расходы на зарплату.' : 'Аванс вычитается из зарплаты за месяц.') + '</div>' +
    '<button class="btn btn-second" data-pmsave' + disabledIf(okm) + '>Записать</button></div>';
  return '<section class="scr">' + backTo('people', 'Люди', 'Назад к списку сотрудников') + titleSub(p.n, p.role + ' / ' + shopOf(p)) + flashHtml() + '<div class="cols"><div class="scr">' + hero + calc + '</div><div class="scr">' + acts + data + money_ + '</div></div></section>';
}
function personFormHtml() {
  var x = st.pEdit, ok = x.n.trim().length >= 2, seller = x.role === 'Старший продавец' || x.role === 'Продавец';
  var pctRow = seller ? '<div class="ln"><span class="name">Процент с личных продаж</span><span class="stp w"><button data-ppct="-1" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + x.pct + '%</span><button data-ppct="1" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span><span class="meta">По умолчанию ' + st.rules.pct + '% из «Правил»</span></div>' : '';
  return '<section class="scr narrow">' + backTo(x.id ? 'person' : 'people', x.id ? 'Сотрудник' : 'Люди', 'Назад') + '<div class="t-h1">' + (x.id ? 'Изменить сотрудника' : 'Новый сотрудник') + '</div>' +
    lblInput('Имя', 'pname', x.n, 'Например, Руслан Алиев', ' maxlength="30"') + lblInput('Телефон', 'pphone', x.phone, '+7 928 555-00-00', ' inputmode="tel" maxlength="18"') +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Роль</span>' + chipsOf('data-prole', STAFF_ROLES.map(function (r) { return [r, r]; }), x.role) + '</div>' +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Магазин</span>' + chipsOf('data-pshop', SHOPS.concat(['Все']).map(function (s) { return [s, s === 'Все' ? 'Все магазины' : s]; }), x.shop) + '</div>' +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Оклад в месяц</span><label class="big-in"><input id="psal" data-in="psal" inputmode="numeric" placeholder="0" value="' + spacedNum(x.salary) + '" aria-label="Оклад" autocomplete="off"><span class="cur">₽</span></label></div>' + pctRow +
    '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s2)">' + lblInput('Возраст', 'page', x.age, '', ' inputmode="numeric"') + '</div>' +
    '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Оклад, процент и магазин сразу меняют зарплату, расходы и прибыль.</span></div>' +
    '<button class="btn btn-main" data-psave' + disabledIf(ok) + '>' + (x.id ? 'Сохранить' : 'Добавить сотрудника') + '</button></section>';
}

