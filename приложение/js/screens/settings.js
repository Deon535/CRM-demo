// ▪ Файл js/screens/settings.js: экраны «Настройки» (6 подразделов). Подключается в index.html по порядку.
// ----- Настройки (ТЗ 12.4). Только владелец. Скидки, возврат, бронь, предоплата, процент и бонус сразу меняют другие экраны -----
function settingsHtml() {
  var r = st.rules, on = st.mods.filter(Boolean).length, ton = st.types.filter(Boolean).length;
  var items = [['shop', 'Магазин', (st.shopName || 'CRM') + ' / рубль / русский язык'], ['points', 'Торговые точки', '4 магазина и склад'], ['rules', 'Правила', 'Скидки до ' + r.discSeller + '% и ' + r.discSenior + '%, возврат ' + r.retDays + ' дней'],
    ['roles', 'Права ролей', ROLE_NAMES.length + ' ролей'], ['types', 'Виды товара и размеры', ton + ' из ' + st.types.length + ' включено'], ['mods', 'Модули', on + ' из ' + st.mods.length + ' включено']];
  return '<section class="scr">' + titleSub('Настройки', 'Всё, что магазин решает сам') + '<div>' + items.map(function (i) {
    return '<button class="mrow srow" data-set="' + i[0] + '"><span class="grow"><b>' + i[1] + '</b><span class="sub">' + i[2] + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div></section>';
}
var setHead = function (title, sub) { return backTo('settings', 'Настройки', 'Назад к настройкам') + titleSub(title, sub) + flashHtml(); };
function settingHtml() {
  var id = st.setId, h, b = '';
  if (id === 'shop') {
    var kv = [['Логотип', 'не загружен'], ['Валюта', 'рубль, ₽'], ['Формат цены', numSp('12 900 ₽')], ['Формат даты', numSp('1 нояб 2026')], ['Язык', 'русский'], ['Цвет бренда', 'чернила (меняется в панели твиков)']];
    h = setHead('Магазин', 'Название, валюта, язык');
    b = lblInput('Название магазина', 'setname', st.shopName, 'Например, Магомед', ' maxlength="16"') + '<div class="t-label">Видно вверху боковой панели на компьютере.</div><div>' +
      kv.map(function (r) { return '<div class="rowline"><span class="t-label">' + r[0] + '</span><b style="text-align:right">' + r[1] + '</b></div>'; }).join('') + '</div>';
  } else if (id === 'points') {
    h = setHead('Торговые точки', 'Число точек не ограничено');
    b = '<div>' + SHOP_OPTS.map(function (s) { var k = st.staff.filter(function (p) { return p.shop === s; }).length; return '<div class="rowline"><span><b>' + s + '</b><span class="t-label" style="display:block">' + (s === 'Склад' ? 'остатки не заведены' : numSp(k) + ' ' + plural(k, 'сотрудник', 'сотрудника', 'сотрудников')) + '</span></span><span class="chip chip-neutral">' + (s === 'Склад' ? 'склад' : 'магазин') + '</span></div>'; }).join('') + '</div>' +
      stubBtn('btn-second', 'i-plus', 'Добавить точку', 'Демо: в настоящей системе откроется форма новой точки (название, адрес, тип).');
  } else if (id === 'rules') {
    h = setHead('Правила', 'Меняйте числа и смотрите на экранах');
    b = '<div>' + RULE_ROWS.map(function (r) {
      var v = st.rules[r[0]], t = r[5] === ' ₽' ? money(v) : v + (r[5] === '%' ? '%' : ' дн.');
      return '<div class="ln"><span class="name">' + r[1] + '</span><span class="stp w"><button data-rule="' + r[0] + ':-1" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + t + '</span><button data-rule="' + r[0] + ':1" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span><span class="meta">' + r[6] + '</span></div>';
    }).join('') + '</div><button class="linkbtn" data-rulesreset>Вернуть стандартные значения</button>';
  } else if (id === 'roles') {
    var ri = ROLE_NAMES.indexOf(st.roleSel);
    h = setHead('Права ролей', 'Кто что видит и делает');
    b = chipsOf('data-rolesel', ROLE_NAMES.map(function (r) { return [r, r]; }), st.roleSel) + '<div>' + RIGHTS.map(function (r) { var v = r[1][ri]; return '<div class="rowline"><span>' + r[0] + '</span>' + (v ? '<span class="chip chip-good">' + v + '</span>' : '<span class="chip chip-neutral">нет</span>') + '</div>'; }).join('') + '</div>' +
      stubBtn('btn-second', 'i-plus', 'Создать свою роль', 'Демо: в настоящей системе откроется выбор прав для новой роли.');
  } else {
    var isT = id === 'types', src = isT ? TYPES : MODULES, key = isT ? 'types' : 'mods';
    h = setHead(isT ? 'Виды товара' : 'Модули', isT ? 'Какую одежду продаёт магазин' : 'Что включено в системе');
    b = '<div class="togs">' + src.map(function (m, i) { return '<button class="tog multi" data-tog="' + key + ':' + i + '" aria-pressed="' + st[key][i] + '"><span class="box"><svg class="ic"><use href="#i-check"/></svg></span><span><b>' + m[0] + '</b><span class="sub">' + m[1] + '</span></span></button>'; }).join('') + '</div>' +
      '<div class="t-label">Переключатели запоминаются, на других экранах демо пока ничего не меняют.</div>';
  }
  return '<section class="scr narrow">' + h + b + '</section>';
}
