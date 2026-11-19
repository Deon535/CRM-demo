// ▪ Файл js/screens/sale.js: экран «Продажа»: корзина (поиск товара, размер, количество), скидка в пределах лимита роли, оплата, клиент, кнопка «Продано».
// С сервером «Продано» отправляет чек на сервер (адрес POST /api/sales), он сам берёт цены, проверяет наличие и лимит скидки и списывает остаток.
// Без сервера (демо): то же на экране, остатки не меняются. Подключается в index.html по порядку.

var SALE_PAY = [['cash', 'Наличные'], ['card', 'Карта'], ['transfer', 'Перевод']];

// Деньги в копейках → «2 631,50 ₽» (копейки показываем, только если они есть)
function moneyK(k) {
  var r = Math.floor(k / 100), c = k % 100;
  return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (c ? ',' + (c < 10 ? '0' : '') + c : '') + ' ₽';
}

// ----- Что в чеке и сколько это стоит -----
function saleShopName() { return cfg().shop || st.sale.shop || SHOPS[0] || ''; }   // у продавца свой магазин, у владельца выбирает сам
function saleShopIdx() { return SHOPS.indexOf(saleShopName()); }
function saleLimitPct() { return st.role === 'Владелец' ? 100 : st.role === 'Старший продавец' ? st.rules.discSenior : st.rules.discSeller; }
function saleLines() {   // строки корзины с ценой и тем, сколько доступно в магазине
  var si = saleShopIdx();
  return st.sale.items.map(function (l) {
    var d = DATA[l.i], x = EXTRA[l.i];
    return { i: l.i, j: l.j, n: l.n, name: d.n, size: x.sizes[l.j], priceK: x.priceK != null ? x.priceK : x.price * 100, avail: si < 0 ? 0 : d.rows[si][l.j] };
  });
}
function saleTotals() {   // считаем в копейках тем же способом, что и сервер
  var sub = 0, count = 0;
  saleLines().forEach(function (l) { sub += l.priceK * l.n; count += l.n; });
  var disc = Math.round(sub * st.sale.pct / 100);
  return { sub: sub, disc: disc, total: sub - disc, count: count };
}
// Чек изменился: прежний номер чека и ошибка больше не годятся
function saleTouch() { st.sale.uid = null; st.sale.err = ''; }
function saleUid() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

// ----- Действия с корзиной (их вызывает events.js) -----
function saleAdd(i, j) {
  var s = st.sale, si = saleShopIdx(), avail = si < 0 ? 0 : DATA[i].rows[si][j], line = s.items.filter(function (l) { return l.i === i && l.j === j; })[0];
  saleTouch();
  if (line) { if (line.n < avail) line.n++; else s.err = 'Больше нет в наличии: доступно ' + avail + '.'; }
  else if (avail > 0) s.items.push({ i: i, j: j, n: 1 });
  s.pick = null; s.pq = '';
  render();
}
function saleQty(k, d) {
  var s = st.sale, l = s.items[k], si = saleShopIdx(); if (!l) return;
  saleTouch();
  var n = l.n + d;
  if (n <= 0) s.items.splice(k, 1);
  else if (n > DATA[l.i].rows[si][l.j]) s.err = 'Больше нет в наличии: доступно ' + DATA[l.i].rows[si][l.j] + '.';
  else l.n = n;
  render();
}
function salePct(d) {
  var s = st.sale, lim = saleLimitPct(), n = s.pct + d;
  saleTouch();
  if (n > lim) s.err = 'Ваш предел скидки ' + lim + '%.'; else s.pct = Math.max(0, n);
  render();
}

// ----- «Продано» -----
function saleDone(no, totalK) {
  var s = st.sale, si = Math.max(0, saleShopIdx());
  if (s.cid) {   // пока клиенты живут только на экране (на сервер переедут в шаге 3.7): покупку пишем в карточку клиента здесь
    var cl = clientById(s.cid);
    saleLines().forEach(function (l) { cl.buys.push([0, l.i, l.size, si, l.n]); });
  }
  s.done = true; s.res = { no: no, totalK: totalK };
  render(); $('content').scrollTop = 0;
}
function saleFinish() {
  var s = st.sale, lines = saleLines(); if (!lines.length || s.busy) return;
  var tot = saleTotals(), shop = saleShopName();
  if (!SERVER.on) { st.saleN = (st.saleN || 0) + 1; saleDone(2431 + st.saleN, tot.total); return; }   // демо без сервера: остатки не меняются
  if (!s.uid) s.uid = saleUid();
  var body = {
    uid: s.uid, payment: s.pay, discountPct: s.pct, shopId: SHOP_IDS[SHOPS.indexOf(shop)],
    items: lines.map(function (l) { return { variantId: EXTRA[l.i].variantIds[l.j], qty: l.n }; })
  };
  s.busy = true; s.err = ''; render();
  apiCall('POST', '/api/sales', body).then(function (r) {
    s.busy = false;
    var d = r.data || {};
    if (r.status === 200 || r.status === 201) {
      d.sale.stock.forEach(function (x) { catalogAvail(d.sale.shop.name, x.variantId, x.available); });   // остаток на экране сразу становится настоящим
      saleDone(d.sale.id, d.sale.totalKopecks); return;
    }
    if (d.code === 'not_enough' && d.shortages) {
      d.shortages.forEach(function (x) { catalogAvail(shop, x.variantId, x.available); });
      s.items = s.items.filter(function (l) { return DATA[l.i].rows[saleShopIdx()][l.j] > 0; });   // того, чего больше нет, в чеке не оставляем
      s.items.forEach(function (l) { l.n = Math.min(l.n, DATA[l.i].rows[saleShopIdx()][l.j]); });
      s.err = d.error + '. Чек поправлен по остатку, проверьте и нажмите «Продано» ещё раз.';
    } else if (r.status === 401) s.err = 'Пропуск закончился. Выйдите и войдите снова: чек в памяти сохранится, пока не закроете страницу.';
    else s.err = d.error || 'Не удалось оформить продажу. Попробуйте ещё раз.';
    render();
  }).catch(function () {
    s.busy = false;
    s.err = 'Нет связи с сервером. Чек не отправлен. Нажмите «Продано» ещё раз: второй чек не создастся.';
    render();
  });
}

// ----- Экран -----
function saleScreenHtml() {
  var sale = st.sale, c = sale.cid ? clientById(sale.cid) : null, head = '<div class="sale-head"><div class="t-h1">Продажа</div><button class="iconbtn" data-back aria-label="Закрыть продажу"><svg class="ic"><use href="#i-close"/></svg></button></div>';
  if (sale.done) return '<section class="scr">' + head + '<div class="done"><span class="okc"><svg class="ic"><use href="#i-check"/></svg></span><div class="t-h1">Продано</div><div class="t-label">Чек № ' + numSp(sale.res.no) + ' / ' + numSp(moneyK(sale.res.totalK)) + '</div>' +
    '<div class="t-label">' + (c ? 'Покупка записана в карточку клиента: ' + esc(c.n) + '.' : 'Клиент не привязан.') + '</div>' +
    (SERVER.on ? (c ? '<div class="t-label">Связь клиента с чеком на сервере появится вместе с разделом «Клиенты».</div>' : '') : '<div class="t-label">Демо: остатки не меняются.</div>') + '</div><button class="btn btn-main" data-salenew>Новая продажа</button><button class="btn btn-second" data-back>Закрыть</button></section>';

  // клиент (без изменений: привязка по телефону, не обязательна)
  var q = (sale.q || '').trim().toLowerCase(), qd = digitsOf(q);
  var found = !c && (qd.length >= 3 || q.length >= 2) ? st.clients.filter(function (x) { return (qd.length >= 3 && digitsOf(x.phone).indexOf(qd) >= 0) || (q.length >= 2 && x.n.toLowerCase().indexOf(q) >= 0); }).slice(0, 3) : [];
  var client = c ? '<div class="chk"><div class="chk-h"><span class="t-h2">' + esc(c.n) + '</span><button class="iconbtn" data-saleunlink aria-label="Убрать клиента из чека"><svg class="ic"><use href="#i-close"/></svg></button></div><div class="t-label">' + numSp(c.phone) + ' / ' + cliBuys(c.buys.length) + ' на ' + numSp(money(cliTotal(c))) + '</div></div>' :
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Клиент (по желанию, чтобы не задерживать очередь)</span><label class="field"><svg class="ic"><use href="#i-phone"/></svg><input id="saleq" data-in="saleq" value="' + esc(sale.q) + '" placeholder="Телефон или имя" aria-label="Клиент" autocomplete="off"></label>' +
    (found.length ? '<div>' + found.map(function (x) { return '<button class="prow" data-salecli="' + x.id + '"><span><b>' + x.n + '</b><span class="sub">' + numSp(x.phone) + '</span></span><span class="r"><span class="t-label">' + cliBuys(x.buys.length) + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>'; }).join('') + '</div>' : (qd.length >= 3 || q.length >= 2) ? '<div class="t-label">Не нашли такого клиента.</div>' : '') +
    '<button class="linkbtn" data-cnew="sale">Новый клиент</button></div>';

  // поиск товара и выбор размера
  var si = saleShopIdx(), pq = (sale.pq || '').trim().toLowerCase();
  var foundP = pq.length >= 2 ? DATA.map(function (d, i) { return i; }).filter(function (i) { return DATA[i].n.toLowerCase().indexOf(pq) >= 0 || EXTRA[i].art.toLowerCase().indexOf(pq) >= 0; }).slice(0, 6) : [];
  var results = foundP.length ? '<div>' + foundP.map(function (i) {
    var n = si < 0 ? 0 : sum(DATA[i].rows[si]);
    return '<button class="prow" data-saleprod="' + i + '"><span><b>' + esc(DATA[i].n) + '</b><span class="sub">' + esc(EXTRA[i].art) + ' / ' + esc(DATA[i].meta) + '</span></span><span class="r"><span class="price">' + nb(DATA[i].price) + '</span>' + (n ? '<span class="chip chip-good">в наличии <span class="num">' + n + '</span></span>' : '<span class="chip chip-neutral">нет у вас</span>') + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' : pq.length >= 2 ? '<div class="t-label">Ничего не найдено. Попробуйте другое название или артикул.</div>' : '';
  var picker = '';
  if (sale.pick != null && DATA[sale.pick]) {
    var pd = DATA[sale.pick], px = EXTRA[sale.pick];
    picker = '<div class="chk"><div class="chk-h"><span class="t-h2">' + esc(pd.n) + '</span><button class="iconbtn" data-salepickx aria-label="Не выбирать размер"><svg class="ic"><use href="#i-close"/></svg></button></div>' +
      '<div class="t-label">Размер (сколько доступно у вас в магазине)</div><div class="fchips wrap">' + px.sizes.map(function (sz, j) {
        var a = si < 0 ? 0 : pd.rows[si][j];
        return '<button class="fchip" data-salesize="' + j + '"' + (a ? '' : ' disabled') + '>' + esc(sz) + ' · ' + a + '</button>';
      }).join('') + '</div></div>';
  }
  var search = '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input id="salepq" data-in="salepq" value="' + esc(sale.pq) + '" placeholder="Название или артикул" aria-label="Поиск товара" autocomplete="off"><svg class="ic"><use href="#i-scan"/></svg></label>';

  // чек
  var lines = saleLines(), tot = saleTotals();
  var cart = lines.length ? lines.map(function (l, k) {
    return '<div class="ln"><span class="name">' + esc(l.name) + '</span>' +
      '<span class="stp"><button data-saleline="' + k + '" data-saledelta="-1" aria-label="' + (l.n === 1 ? 'Убрать из чека' : 'Меньше') + '"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + l.n + '</span><button data-saleline="' + k + '" data-saledelta="1" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span>' +
      '<span class="meta">' + esc(l.size) + ' / ' + moneyK(l.priceK) + (l.n > 1 ? ' × ' + l.n + ' = ' + moneyK(l.priceK * l.n) : '') + ' / доступно ' + l.avail + '</span></div>';
  }).join('') : '<div class="t-label">Чек пустой. Найдите товар и выберите размер.</div>';

  // справа: магазин (только у владельца), скидка, оплата, итог
  var shopSeg = cfg().shop ? '' : '<div style="display:grid;gap:var(--s2)"><span class="t-label">Магазин, где идёт продажа</span><div class="fchips wrap">' + SHOPS.map(function (s) { return '<button class="fchip" data-saleshop="' + esc(s) + '" aria-pressed="' + (s === saleShopName()) + '">' + esc(s) + '</button>'; }).join('') + '</div></div>';
  var disc = '<div class="ln"><span class="name">Скидка на весь чек</span><span class="stp w"><button data-salepct="-1" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + sale.pct + '%</span><button data-salepct="1" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span>' +
    '<span class="meta">Ваш предел: ' + limitText() + (tot.disc ? ' / <span class="num bad" style="font-weight:700">−' + moneyK(tot.disc) + '</span>' : '') + '</span></div>';
  var pay = '<div class="seg">' + SALE_PAY.map(function (p) { return '<button data-salepay="' + p[0] + '" aria-pressed="' + (sale.pay === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
  var err = sale.err ? '<div class="notice bad"><svg class="ic"><use href="#i-alert"/></svg><span>' + esc(sale.err) + '</span></div>' : '';
  var off = !lines.length || sale.busy ? ' disabled' : '';

  return '<section class="scr">' + head +
    '<div class="cols"><div style="display:grid;gap:var(--s4);align-content:start">' + search + results + picker +
    '<div><div class="sec-h"><span class="t-h2">Чек</span><span class="t-label"><span class="num">' + tot.count + '</span> ' + plural(tot.count, 'вещь', 'вещи', 'вещей') + '</span></div>' + cart + '</div>' + client + '</div>' +
    '<div style="display:grid;gap:var(--s4);align-content:start">' + shopSeg + disc + pay +
    '<div class="hero-sum"><div class="t-label">Итого</div><div class="hero-num" style="font-size:clamp(36px,' + Math.min(22, Math.floor(190 / moneyK(tot.total).length)) + 'cqi,96px)">' + moneyK(tot.total) + '</div></div>' + err +
    '<button class="btn btn-main" data-saledone' + off + '>' + (sale.busy ? 'Отправляем…' : 'Продано') + '</button></div></div></section>';
}

