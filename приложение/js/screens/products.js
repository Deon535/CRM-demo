// ▪ Файл js/screens/products.js: экран «Товар»: список. Подключается в index.html по порядку.
function productsHtml() {
  var si = SHOPS.indexOf(st.shop);
  if (st.shop === 'Склад') {
    return '<div class="empty"><svg class="ic"><use href="#i-box"/></svg><div class="t-h2">На складе пока пусто</div><p>Остатки склада Махачкала в демо не заведены. Они появятся при вводе начальных остатков.</p></div>';
  }
  var q = st.q.trim().toLowerCase();
  var rows = DATA.filter(function (d) { return (st.cat === 'Все' || d.cat === st.cat) && (!q || d.n.toLowerCase().indexOf(q) >= 0); });
  var chips = '<div class="fchips">' + CATS.map(function (c) { return '<button class="fchip" data-cat="' + c + '" aria-pressed="' + (c === st.cat) + '">' + c + '</button>'; }).join('') + '</div>';
  var head = '<div class="t-label">' + (st.shop === 'Все' ? 'Остатки по всей сети' : 'Остатки: ' + st.shop) + (q ? ' / поиск «' + st.q.trim() + '»' : '') + '</div>';
  if (!rows.length) return chips + head + '<div class="empty"><svg class="ic"><use href="#i-search"/></svg><div class="t-h2">Ничего не найдено</div><p>Попробуйте другое название или уберите фильтр.</p></div>';
  return chips + head + '<div>' + rows.map(function (d) {
    var n = si < 0 ? sum(d.rows.map(sum)) : sum(d.rows[si]);
    var chip = n === 0 ? '<span class="chip chip-neutral">нет в наличии</span>' : n <= 2 ? '<span class="chip chip-bad">осталось <span class="num">' + n + '</span></span>' : '<span class="chip chip-good">в наличии <span class="num">' + n + '</span></span>';
    return '<button class="prow" data-product="' + DATA.indexOf(d) + '"><span><b>' + d.n + '</b><span class="sub">' + d.meta + '</span></span><span class="r"><span class="price">' + nb(d.price) + '</span>' + chip + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>';
}

