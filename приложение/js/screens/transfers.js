// ▪ Файл js/screens/transfers.js: экраны «Перемещения»: список, приём, создание. Подключается в index.html по порядку.
// ===== Перемещения: список, приём («Всё сошлось», веер 6), создание =====
var SHOP_OPTS = ['Махачкала', 'Каспийск', 'Дербент', 'Хасавюрт', 'Склад'];
var trUnits = function (x) { return x.lines.reduce(function (a, l) { return a + l.sent; }, 0); };
var trSum = function (x) { return x.lines.reduce(function (a, l) { return a + l.sent * l.price; }, 0); };
function trShort(x, got) { var u = 0, s = 0; x.lines.forEach(function (l, i) { var d = Math.max(0, l.sent - got[i]); u += d; s += d * l.price; }); return { u: u, s: s, notify: u > 2 || s > 5000 }; }
function trById(id) { return st.tr.filter(function (x) { return x.id === id; })[0]; }
function trChip(x) {
  if (x.status === 'transit') return '<span class="chip chip-neutral">в пути</span>';
  var d = trShort(x, x.got);
  return d.u ? '<span class="chip chip-bad">не хватило <span class="num">' + d.u + '</span></span>' : '<span class="chip chip-good">принято</span>';
}
function trTabs() { return st.role === 'Старший продавец' ? [['in', 'К приёму'], ['out', 'Отправлено'], ['done', 'Завершено']] : [['transit', 'В пути'], ['done', 'Завершено']]; }
function trFilter(tab) {
  var shop = cfg().shop, senior = st.role === 'Старший продавец';
  return st.tr.filter(function (x) {
    if (tab === 'in') return x.status === 'transit' && x.to === shop;
    if (tab === 'out') return x.status === 'transit' && x.from === shop;
    if (tab === 'transit') return x.status === 'transit';
    return x.status === 'done' && (!senior || x.from === shop || x.to === shop);
  });
}

function transfersHtml() {
  var tabs = trTabs();
  if (!tabs.some(function (x) { return x[0] === st.trTab; })) st.trTab = tabs[0][0];
  var chips = '<div class="fchips tabs" style="--n:' + tabs.length + '">' + tabs.map(function (x) { return '<button class="fchip" data-trtab="' + x[0] + '" aria-pressed="' + (x[0] === st.trTab) + '">' + x[1] + ' <span class="num">' + trFilter(x[0]).length + '</span></button>'; }).join('') + '</div>';
  var rows = trFilter(st.trTab);
  var list = rows.length ? '<div>' + rows.map(function (x) {
    return '<button class="prow" data-tr="' + x.id + '"><span><b>№ ' + x.id + '</b><span class="sub">Откуда: ' + x.from + '</span><span class="sub">Куда: ' + x.to + '</span></span><span class="r"><span class="price">' + trUnits(x) + ' шт</span>' + trChip(x) + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' : '<div class="empty"><svg class="ic"><use href="#i-transfer"/></svg><div class="t-h2">Здесь пока пусто</div><p>Новые перемещения появятся здесь.</p></div>';
  return '<section class="scr"><div class="t-h1">Перемещения</div>' + flashHtml() + '<button class="btn btn-main" data-go="transfer-new"><svg class="ic"><use href="#i-plus"/></svg>Новое перемещение</button>' + chips + list + '</section>';
}

function transferHtml() {
  var x = trById(st.trId), c = cfg();
  var canRecv = x.status === 'transit' && (st.role === 'Владелец' || x.to === c.shop);
  var route = '<div><div class="sec-h"><span class="t-h2">Перемещение № <span class="num">' + x.id + '</span></span>' + trChip(x) + '</div>' +
    '<div class="rowline"><span class="t-label">Откуда</span><b>' + x.from + (x.from === c.shop ? ', ваш магазин' : '') + '</b></div>' +
    '<div class="rowline"><span class="t-label">Куда</span><b>' + x.to + (x.to === c.shop ? ', ваш магазин' : '') + '</b></div>' +
    '<div class="rowline"><span class="t-label">Отправил</span><b>' + x.by + '</b></div></div>';
  var body;
  if (x.status === 'done') {
    var d = trShort(x, x.got);
    body = '<div>' + x.lines.map(function (l, i) { return '<div class="ln' + (x.got[i] < l.sent ? ' diff' : '') + '"><span class="name">' + l.n + '</span><span class="qty">' + x.got[i] + ' из ' + l.sent + '</span><span class="meta">' + l.meta + '</span></div>'; }).join('') + '</div>' +
      (d.u ? '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Не хватило <b class="num bad">' + d.u + ' шт</b> на <span class="num">' + money(d.s) + '</span> по цене продажи. Расхождение разбирает старший продавец.' + (d.notify ? ' Владельцу сообщили.' : '') + '</span></div>' : '<div class="chip chip-good" style="justify-self:start">Всё сошлось: <span class="num">' + trUnits(x) + '</span> шт</div>');
  } else if (!canRecv) {
    body = '<div>' + x.lines.map(function (l) { return '<div class="ln"><span class="name">' + l.n + '</span><span class="qty">' + l.sent + '</span><span class="meta">' + l.meta + '</span></div>'; }).join('') + '</div>' +
      '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Ждём приёма в магазине «' + x.to + '». Принять может старший продавец получателя.</span></div>';
  } else if (!st.trOpen) {
    body = '<div>' + x.lines.map(function (l) { return '<div class="ln"><span class="name">' + l.n + '</span><span class="qty">' + l.sent + '</span><span class="meta">' + l.meta + '</span></div>'; }).join('') + '</div>' +
      '<div class="t-label">Всего <span class="num">' + trUnits(x) + '</span> шт</div><button class="btn btn-main" data-traccept>Всё сошлось, принять</button><button class="linkbtn" style="justify-self:center" data-tropen>Есть расхождение</button>';
  } else {
    var dd = trShort(x, st.trGot);
    body = '<div>' + x.lines.map(function (l, i) {
      return '<div class="ln' + (st.trGot[i] < l.sent ? ' diff' : '') + '"><span class="name">' + l.n + '</span><span class="stp"><button data-trdec="' + i + '" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + st.trGot[i] + '</span><button data-trinc="' + i + '" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span><span class="meta">' + l.meta + '<br>отправлено&nbsp;<span class="num">' + l.sent + '</span></span></div>';
    }).join('') + '</div>' +
      (dd.u ? '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Не хватает <b class="num bad">' + dd.u + ' шт</b> на <span class="num">' + money(dd.s) + '</span> по цене продажи. Расхождение разбирает старший продавец.' + (dd.notify ? ' Владельцу сообщим автоматически.' : '') + '</span></div>' : '<div class="chip chip-good" style="justify-self:start">Всё сошлось: <span class="num">' + trUnits(x) + '</span> шт</div>') +
      '<button class="btn btn-main" data-traccept>' + (dd.u ? 'Принять с расхождением' : 'Принять') + '</button>';
  }
  return '<section class="scr">' + backRow('Перемещения') + '<div class="t-h1">' + (canRecv ? 'Приём' : 'Перемещение') + '</div>' + route + body + '</section>';
}

function newNt() { var from = cfg().shop || 'Махачкала'; return { from: from, to: SHOP_OPTS.filter(function (s) { return s !== from; })[0], q: '', qty: {} }; }
function stockRows(from) {
  var si = SHOPS.indexOf(from), rows = [];
  if (si < 0) return rows;
  DATA.forEach(function (d, i) { d.rows[si].forEach(function (cnt, j) { if (cnt > 0) rows.push({ key: i + ':' + j, n: d.n, size: EXTRA[i].sizes[j], color: d.meta.split(' / ')[0], have: cnt, price: EXTRA[i].price }); }); });
  return rows;
}
function newTransferHtml() {
  var nt = st.nt, own = cfg().shop, all = stockRows(nt.from), q = nt.q.trim().toLowerCase();
  var rows = all.filter(function (r) { return !q || r.n.toLowerCase().indexOf(q) >= 0; });
  var units = 0, sumv = 0;
  all.forEach(function (r) { var n = nt.qty[r.key] || 0; units += n; sumv += n * r.price; });
  var chipRow = function (attr, list, cur) { return '<div class="fchips">' + list.map(function (s) { return '<button class="fchip" ' + attr + '="' + s + '" aria-pressed="' + (s === cur) + '">' + s + '</button>'; }).join('') + '</div>'; };
  var fromBlock = own ? '<div class="rowline" style="padding:0;border:0"><span class="t-label">Откуда</span><b>' + own + ', ваш магазин</b></div>' : '<div style="display:grid;gap:var(--s2)"><span class="t-label">Откуда</span>' + chipRow('data-ntfrom', SHOP_OPTS.slice(0, 4), nt.from) + '</div>';
  var toBlock = '<div style="display:grid;gap:var(--s2)"><span class="t-label">Куда</span>' + chipRow('data-ntto', SHOP_OPTS.filter(function (s) { return s !== nt.from; }), nt.to) + '</div>';
  var search = '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input id="ntq" value="' + nt.q.replace(/"/g, '&quot;') + '" placeholder="Название вещи" aria-label="Поиск вещи" autocomplete="off"></label>';
  var list = rows.length ? '<div>' + rows.map(function (r) {
    var n = nt.qty[r.key] || 0;
    return '<div class="ln"><span class="name">' + r.n + '</span><span class="stp"><button data-ntdec="' + r.key + '" aria-label="Меньше"><svg class="ic"><use href="#i-minus"/></svg></button><span class="v">' + n + '</span><button data-ntinc="' + r.key + '" aria-label="Больше"><svg class="ic"><use href="#i-plus"/></svg></button></span><span class="meta">' + r.size + ' / ' + r.color + '<br>в наличии&nbsp;<span class="num">' + r.have + '</span></span></div>';
  }).join('') + '</div>' : '<div class="empty"><svg class="ic"><use href="#i-search"/></svg><div class="t-h2">Ничего не найдено</div><p>Попробуйте другое название.</p></div>';
  var sumLine = units ? '<div class="t-label">Выбрано <span class="num">' + units + '</span> шт на <span class="num">' + money(sumv) + '</span> по цене продажи</div>' : '<div class="t-label">Выберите, что везём</div>';
  return '<section class="scr">' + backRow('Перемещения') + '<div class="t-h1">Новое перемещение</div>' +
    '<div class="cols"><div style="display:grid;gap:var(--s4);align-content:start">' + fromBlock + toBlock + search + list + '</div>' +
    '<div style="display:grid;gap:var(--s3);align-content:start">' + sumLine + '<button class="btn btn-main" data-ntsend' + (units ? '' : ' style="opacity:.4"') + '>Отправить</button></div></div></section>';
}

