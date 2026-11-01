// ▪ Файл js/screens/product-card.js: карточка товара. Подключается в index.html по порядку.
function productHtml() {
  var d = DATA[st.product], x = EXTRA[st.product], c = cfg(), own = SHOPS.indexOf(c.shop);
  var total = sum(d.rows.map(sum));
  var totalChip = total === 0 ? '<span class="chip chip-neutral">нет в сети</span>' : total <= 2 ? '<span class="chip chip-bad">осталось <span class="num">' + total + '</span></span>' : '<span class="chip chip-good">в сети <span class="num">' + total + '</span></span>';
  var cards = SHOPS.map(function (s, i) {
    var n = sum(d.rows[i]);
    return '<div class="shop' + (i === own ? ' own' : '') + '"><div class="shop-h"><b>' + s + '</b>' + (i === own ? '<span class="chip chip-neutral">ваш магазин</span>' : '<span class="t-label"><span class="num">' + n + '</span> шт</span>') + '</div>' +
      '<div class="pills" style="grid-template-columns:repeat(' + x.sizes.length + ',minmax(0,1fr))">' + d.rows[i].map(function (v, j) { return '<div class="pill' + (v ? '' : ' z') + '"><span class="t-label">' + x.sizes[j] + '</span><span class="num">' + (v || '&ndash;') + '</span></div>'; }).join('') + '</div></div>';
  }).join('');
  var hold = x.hold ? ' В брони <span class="num">' + x.hold.n + '</span> шт (' + x.sizes[x.hold.size] + ', ' + SHOPS[x.hold.shop] + ').' : '';
  var legend = '<div class="t-label">Числа это «доступно»: на полке минус бронь.' + hold + (own >= 0 ? ' Ваш магазин выделен.' : '') + '</div>';
  var costBlock = st.role === 'Владелец' ?
    '<div><div class="sec-h"><span class="t-h2">Закупка и прибыль</span></div>' +
    '<div class="rowline"><span class="t-label">Закупка, последняя партия</span><span class="num" style="font-weight:700">' + money(x.cost) + '</span></div>' +
    '<div class="rowline"><span class="t-label">Прибыль с вещи</span><span class="num good" style="font-weight:800">' + money(x.price - x.cost) + '</span></div></div>' : '';
  var btns = c.bar ? '<button class="btn btn-main" data-go="sale">Положить в чек</button><button class="btn btn-second" data-hold>Забронировать</button>' :
    st.role === 'Владелец' ? '<button class="btn btn-second" data-go="transfer-new">Переместить товар</button>' : '<button class="btn btn-main">Добавить в заказ</button>';
  return '<section class="scr">' +
    '<div class="top-row"><button class="iconbtn" data-go="products" aria-label="Назад к списку"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">Товар / ' + d.cat + '</span></div>' +
    flashHtml() + '<div><div class="t-h1">' + d.n + '</div><div class="t-label" style="margin-top:6px">Артикул ' + x.art + ' / ' + d.meta + '</div></div>' +
    '<div class="pricebar"><span class="t-big">' + nb(d.price) + '</span>' + totalChip + '</div>' +
    '<div class="cols"><div class="shops">' + cards + '<div class="t-label" style="padding:var(--s1) 2px">Склад: остатки не заведены</div></div>' +
    '<div style="display:grid;gap:var(--s4);align-content:start">' + legend + costBlock + '<div style="display:grid;gap:var(--s2)">' + btns + '</div></div></div></section>';
}

