// ▪ Файл js/screens/sale.js: экран «Продажа» (с привязкой клиента). Подключается в index.html по порядку.
// ----- Продажа с клиентом (ТЗ 6.2: привязка по телефону, но не обязательно) -----
function saleScreenHtml() {
  var sale = st.sale, c = sale.cid ? clientById(sale.cid) : null, head = '<div class="sale-head"><div class="t-h1">Продажа</div><button class="iconbtn" data-back aria-label="Закрыть продажу"><svg class="ic"><use href="#i-close"/></svg></button></div>';
  if (sale.done) return '<section class="scr">' + head + '<div class="done"><span class="okc"><svg class="ic"><use href="#i-check"/></svg></span><div class="t-h1">Продано</div><div class="t-label">Чек № ' + numSp(2432) + ' / ' + numSp(nb('9 956 ₽')) + '</div>' +
    '<div class="t-label">' + (c ? 'Покупка записана в карточку клиента: ' + esc(c.n) + '.' : 'Клиент не привязан.') + '</div></div><button class="btn btn-main" data-salenew>Новая продажа</button><button class="btn btn-second" data-back>Закрыть</button></section>';
  var q = (sale.q || '').trim().toLowerCase(), qd = digitsOf(q);
  var found = !c && (qd.length >= 3 || q.length >= 2) ? st.clients.filter(function (x) { return (qd.length >= 3 && digitsOf(x.phone).indexOf(qd) >= 0) || (q.length >= 2 && x.n.toLowerCase().indexOf(q) >= 0); }).slice(0, 3) : [];
  var client = c ? '<div class="chk"><div class="chk-h"><span class="t-h2">' + esc(c.n) + '</span><button class="iconbtn" data-saleunlink aria-label="Убрать клиента из чека"><svg class="ic"><use href="#i-close"/></svg></button></div><div class="t-label">' + numSp(c.phone) + ' / ' + cliBuys(c.buys.length) + ' на ' + numSp(money(cliTotal(c))) + '</div></div>' :
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Клиент (по желанию, чтобы не задерживать очередь)</span><label class="field"><svg class="ic"><use href="#i-phone"/></svg><input id="saleq" data-in="saleq" value="' + esc(sale.q) + '" placeholder="Телефон или имя" aria-label="Клиент" autocomplete="off"></label>' +
    (found.length ? '<div>' + found.map(function (x) { return '<button class="prow" data-salecli="' + x.id + '"><span><b>' + x.n + '</b><span class="sub">' + numSp(x.phone) + '</span></span><span class="r"><span class="t-label">' + cliBuys(x.buys.length) + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>'; }).join('') + '</div>' : (qd.length >= 3 || q.length >= 2) ? '<div class="t-label">Не нашли такого клиента.</div>' : '') +
    '<button class="linkbtn" data-cnew="sale">Новый клиент</button></div>';
  return '<section class="scr">' + head +
    '<div class="cols"><div style="display:grid;gap:var(--s4);align-content:start">' +
    '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input placeholder="Название или артикул" autocomplete="off"><svg class="ic"><use href="#i-scan"/></svg></label>' +
    '<div><div class="sec-h"><span class="t-h2">Чек</span><span class="t-label"><span class="num">2</span> вещи</span></div>' +
    '<div class="item"><span class="name">Рубашка Oxford</span><span class="price">' + nb('4 990 ₽') + '</span><span class="meta"><span class="num">M</span> / рост <span class="num">182</span> / белый</span><span class="chip chip-good" style="justify-self:end">в наличии <span class="num">3</span></span></div>' +
    '<div class="item"><span class="name">Брюки чинос</span><span class="price">' + nb('5 490 ₽') + '</span><span class="meta"><span class="num">50</span> / синий</span><span class="chip chip-bad" style="justify-self:end">осталось <span class="num">1</span></span></div></div>' + client + '</div>' +
    '<div style="display:grid;gap:var(--s4);align-content:start">' +
    '<div class="rowline" style="padding:0;border:0"><span class="t-label">Скидка <span class="num">5%</span> / ваш предел: ' + limitText() + '</span><span class="num bad" style="font-weight:700">−524&nbsp;₽</span></div>' +
    '<div class="seg"><button aria-pressed="false">Наличные</button><button aria-pressed="true">Карта</button><button aria-pressed="false">Перевод</button></div>' +
    '<div class="hero-sum"><div class="t-label">Итого</div><div class="hero-num">' + nb('9 956 ₽') + '</div></div>' +
    '<button class="btn btn-main" data-saledone>Продано</button></div></div></section>';
}

