// ▪ Файл js/screens/courier.js: экран «Доставки» курьера. Подключается в index.html по порядку.
// ===== Доставки курьера: кнопки прямо в карточках (веер 7, вариант 3) + «Позвонить» =====
var CP_METHODS = ['Наличные', 'Карта', 'Перевод'], CP_REFUSE = ['Не подошло', 'Передумал', 'Не дозвонились'];
function courierOrders() {
  var mine = st.ord.filter(function (o) { return o.courier === 'К1' && (o.st === 'way' || o.st === 'done' || o.st === 'no'); });
  var todo = mine.filter(function (o) { return o.st === 'way'; }).sort(function (a, b) { return a.id - b.id; });
  var rest = mine.filter(function (o) { return o.st !== 'way'; }).sort(function (a, b) { return b.id - a.id; });
  return todo.concat(rest);
}
function courierHtml() {
  var list = courierOrders(), todo = list.filter(function (o) { return o.st === 'way'; }), done = list.filter(function (o) { return o.st === 'done'; });
  var left = todo.reduce(function (a, o) { return a + ordCollect(o); }, 0);
  var cash = done.filter(function (o) { return o.pay === 'Наличные'; }).reduce(function (a, o) { return a + ordCollect(o); }, 0);
  var n = todo.length, foot = n ? ((n % 10 === 1 && n % 100 !== 11 ? 'Осталась ' : 'Осталось ') + '<span class="num">' + n + '</span> ' + plural(n, 'доставка', 'доставки', 'доставок')) : 'Все доставки готовы';
  return tiles(tHero('К получению', money(left), foot), tMid('Доставлено', String(done.length)), tMid('Сдать в кассу', money(cash))) + flashHtml() + list.map(deliveryCard).join('');
}
function deliveryCard(o) {
  var coll = ordCollect(o), cp = st.cp && st.cp.id === o.id ? st.cp : null, right;
  if (o.st === 'done') right = '<span class="chip chip-good">доставлено' + (o.pay ? ', ' + o.pay.toLowerCase() : '') + '</span>';
  else if (o.st === 'no') right = '<span class="chip chip-bad">отказ</span>';
  else right = coll ? '<span class="amt">' + money(coll) + '</span><span class="chip chip-neutral">при получении</span>' : '<span class="chip chip-good">оплачено</span>';
  var body = '';
  if (o.st === 'way') {
    var call = '<a class="btn btn-second btn-sm" href="tel:' + ordTel(o) + '"><svg class="ic"><use href="#i-phone"/></svg>Позвонить</a>';
    if (!cp) body = call + '<div class="dtwo"><button class="btn btn-second btn-sm" data-cp="' + o.id + ':no">Отказ</button><button class="btn btn-main btn-sm"data-cp="' + o.id + ':done">Доставлено</button></div>';
    else if (cp.mode === 'pay') body = call + '<div class="t-label">Как заплатил клиент</div><div class="seg">' + CP_METHODS.map(function (m) { return '<button data-cpv="' + m + '" aria-pressed="' + (cp.val === m) + '">' + m + '</button>'; }).join('') + '</div>' +
      '<div class="rowline"><span class="t-label">Получено</span><b class="num" style="font-size:20px">' + money(coll) + '</b></div>' +
      '<button class="btn btn-main btn-sm"data-cp="' + o.id + ':confirm"' + (cp.val ? '' : ' style="opacity:.4"') + '>Подтвердить</button><button class="linkbtn" style="justify-self:center" data-cp="' + o.id + ':back">Назад</button>';
    else body = call + '<div class="t-label">Причина отказа</div><div class="seg stack">' + CP_REFUSE.map(function (m) { return '<button data-cpv="' + m + '" aria-pressed="' + (cp.val === m) + '">' + m + '</button>'; }).join('') + '</div><div class="t-label">Вещь вернётся в магазин, продавец оформит возврат.</div>' +
      '<button class="btn btn-main btn-sm"data-cp="' + o.id + ':confirm"' + (cp.val ? '' : ' style="opacity:.4"') + '>Записать отказ</button><button class="linkbtn" style="justify-self:center" data-cp="' + o.id + ':back">Назад</button>';
  }
  return '<div class="dcard"><div class="dmini"><span class="ttl"><b>№ <span class="num">' + o.id + '</span> / ' + o.who + '</b><span class="t-label">' + o.city + ', ' + o.addr + '</span></span><span class="r2">' + right + '</span></div>' + body + '</div>';
}

