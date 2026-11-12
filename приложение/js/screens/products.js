// ▪ Файл js/screens/products.js: экран «Товар»: список. Подключается в index.html по порядку.
var PROD_PAGE = 60;   // сколько строк списка показываем за раз
function productsHtml() {
  var si = SHOPS.indexOf(st.shop);
  if (st.shop === 'Склад') {
    return '<div class="empty"><svg class="ic"><use href="#i-box"/></svg><div class="t-h2">На складе пока пусто</div><p>Остатки склада Махачкала в демо не заведены. Они появятся при вводе начальных остатков.</p></div>';
  }
  var q = st.q.trim().toLowerCase();
  var rows = [];   // номера подходящих товаров в DATA
  DATA.forEach(function (d, i) { if ((st.cat === 'Все' || d.cat === st.cat) && (!q || d.n.toLowerCase().indexOf(q) >= 0)) rows.push(i); });
  // Длинный список показываем по частям (ТЗ 10.8): сначала PROD_PAGE строк, дальше кнопка «Показать ещё». При смене фильтра счёт начинается заново.
  var key = st.shop + '|' + st.cat + '|' + q;
  if (st.pKey !== key) { st.pKey = key; st.pLim = PROD_PAGE; }
  var total = rows.length;
  rows = rows.slice(0, st.pLim);
  var chips = '<div class="fchips">' + CATS.map(function (c) { return '<button class="fchip" data-cat="' + c + '" aria-pressed="' + (c === st.cat) + '">' + c + '</button>'; }).join('') + '</div>';
  var head = '<div class="t-label">' + (st.shop === 'Все' ? 'Остатки по всей сети' : 'Остатки: ' + st.shop) + (q ? ' / поиск «' + st.q.trim() + '»' : '') + '</div>';
  if (!rows.length) return chips + head + '<div class="empty"><svg class="ic"><use href="#i-search"/></svg><div class="t-h2">Ничего не найдено</div><p>Попробуйте другое название или уберите фильтр.</p></div>';
  var more = total > rows.length ? '<button class="btn btn-second" data-more>Показать ещё (' + (total - rows.length) + ')</button>' : '';
  return chips + head + '<div>' + rows.map(function (i) {
    var d = DATA[i];
    var n = si < 0 ? sum(d.rows.map(sum)) : sum(d.rows[si]);
    var chip = n === 0 ? '<span class="chip chip-neutral">нет в наличии</span>' : n <= 2 ? '<span class="chip chip-bad">осталось <span class="num">' + n + '</span></span>' : '<span class="chip chip-good">в наличии <span class="num">' + n + '</span></span>';
    return '<button class="prow" data-product="' + i + '"><span><b>' + d.n + '</b><span class="sub">' + d.meta + '</span></span><span class="r"><span class="price">' + nb(d.price) + '</span>' + chip + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' + more;
}

