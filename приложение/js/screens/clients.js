// ▪ Файл js/screens/clients.js: экраны «Клиенты»: список, карточка, создание, рассылка. Подключается в index.html по порядку.
// ----- Клиенты (ТЗ 6): список, карточка, создание и правка, подбор для рассылки -----
var clientById = function (id) { return st.clients.filter(function (c) { return c.id === id; })[0]; };
var cliTotal = function (c) { return sum(c.buys.map(function (b) { return b[4] * EXTRA[b[1]].price; })); };
var cliLast = function (c) { return c.buys.length ? Math.min.apply(null, c.buys.map(function (b) { return b[0]; })) : 9999; };
var cliSeen = function (c) { return c.buys.length ? agoText(cliLast(c)) : 'нет покупок'; };
var cliHas = function (c, cat) { return c.buys.some(function (b) { return DATA[b[1]].cat === cat; }); };
var cliSeason = function (c, s) { return c.buys.some(function (b) { return seasonOf(b[0]) === s; }); };
function cliCats(c) { var m = {}; c.buys.forEach(function (b) { var k = DATA[b[1]].cat; m[k] = (m[k] || 0) + b[4]; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }); }
var cliPhone = function (c) { return c.phone.replace(/[^+\d]/g, ''); };
var cliBuys = function (n) { return numSp(n) + ' ' + plural(n, 'покупка', 'покупки', 'покупок'); };
function clientsHtml() {
  var mail = st.cliMode === 'mail';
  var mode = chipsOf('data-climode', [['list', 'Список'], ['mail', 'Для рассылки']], st.cliMode, true);
  if (mail) {
    var sizes = [['Все', 'Все']].concat(CLOTH_SIZES.map(function (s) { return [s, s]; })), cats = CATS.map(function (c) { return [c, c]; });
    var hit = st.clients.filter(function (c) { return (st.mSize === 'Все' || c.cloth === st.mSize) && (st.mCat === 'Все' || cliHas(c, st.mCat)) && (st.cliSeason === 'Все' || cliSeason(c, st.cliSeason)); });
    var list = hit.length ? '<div>' + hit.map(function (c) { return '<div class="callrow"><span><b>' + c.n + '</b><span class="sub">' + numSp(c.phone) + ' / размер ' + numSp(c.cloth) + '</span></span><a class="iconbtn" href="tel:' + cliPhone(c) + '" aria-label="Позвонить: ' + c.n + '"><svg class="ic"><use href="#i-phone"/></svg></a></div>'; }).join('') + '</div>' :
      '<div class="empty"><svg class="ic"><use href="#i-users"/></svg><div class="t-h2">Никто не подходит</div><p>Попробуйте убрать одно из условий.</p></div>';
    var copy = hit.length ? stubBtn('btn-main', '', 'Скопировать ' + hit.length + ' ' + plural(hit.length, 'номер', 'номера', 'номеров'), 'Демо: номера не копируются. В настоящей системе список уйдёт в буфер обмена, и вы отправите рассылку сами (' + hit.length + ' ' + plural(hit.length, 'клиент', 'клиента', 'клиентов') + ').') : '';
    return '<section class="scr">' + titleSub('Клиенты', 'Кому написать: выберите условия') + mode + flashHtml() +
      '<div class="cols"><div class="scr"><div style="display:grid;gap:var(--s2)"><span class="t-label">Размер одежды</span>' + chipsOf('data-msize', sizes, st.mSize) + '</div>' +
      '<div style="display:grid;gap:var(--s2)"><span class="t-label">Что покупал</span>' + chipsOf('data-mcat', cats, st.mCat) + '</div>' +
      '<div style="display:grid;gap:var(--s2)"><span class="t-label">Когда покупал</span>' + chipsOf('data-mseason', SEASONS, st.cliSeason) + '</div>' +
      '<div class="t-label">Рассылку вы отправляете сами. Автоматическая будет позже.</div></div>' +
      '<div class="scr">' + secH('Подходит', numSp(hit.length) + ' ' + plural(hit.length, 'клиент', 'клиента', 'клиентов')) + list + copy + '</div></div></section>';
  }
  var q = (st.cliQ || '').trim().toLowerCase(), qd = digitsOf(q);
  var segs = [['all', 'Все'], ['new', 'Недавно'], ['old', 'Давно не были'], ['note', 'С заметкой']];
  var rows = st.clients.filter(function (c) {
    var l = cliLast(c), s = st.cliSeg;
    if (s === 'new' && l > 30) return false; if (s === 'old' && !(c.buys.length && l > 60)) return false; if (s === 'note' && !c.note) return false;
    return !q || c.n.toLowerCase().indexOf(q) >= 0 || (qd && digitsOf(c.phone).indexOf(qd) >= 0);
  }).sort(function (a, b) { return cliLast(a) - cliLast(b); });
  var search = '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input id="cliq" data-in="cliq" value="' + esc(st.cliQ) + '" placeholder="Телефон или имя клиента" aria-label="Поиск клиента" autocomplete="off"></label>';
  var body = rows.length ? '<div>' + rows.map(function (c) {
    return '<button class="prow" data-client="' + c.id + '"><span><b>' + c.n + '</b><span class="sub">' + numSp(c.phone) + '</span><span class="sub">' + c.city + ' / ' + cliBuys(c.buys.length) + '</span></span><span class="r"><span class="price">' + money(cliTotal(c)) + '</span><span class="t-label">' + cliSeen(c) + '</span></span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' : '<div class="empty"><svg class="ic"><use href="#i-search"/></svg><div class="t-h2">Никого не нашли</div><p>Проверьте номер или имя.</p></div>';
  return '<section class="scr">' + titleSub('Клиенты', numSp(st.clients.length) + ' ' + plural(st.clients.length, 'клиент', 'клиента', 'клиентов')) + flashHtml() + mode +
    '<button class="btn btn-second" data-cnew="clients"><svg class="ic"><use href="#i-plus"/></svg>Новый клиент</button>' + search + chipsOf('data-cliseg', segs, st.cliSeg) + body + '</section>';
}
function clientHtml() {
  var c = clientById(st.cliId), cats = cliCats(c), dash = function (v, u) { return v ? numSp(v) + (u || '') : '—'; };
  var hero = heroTile('Сумма покупок', money(cliTotal(c)), c.buys.length ? cliBuys(c.buys.length) + ' / последний визит: ' + agoText(cliLast(c)) : 'покупок пока нет');
  var acts = '<div class="dtwo even"><a class="btn btn-second" href="tel:' + cliPhone(c) + '"><svg class="ic"><use href="#i-phone"/></svg>Позвонить</a><button class="btn btn-second" data-cedit="' + c.id + '">Изменить</button></div>';
  var info = [['Телефон', numSp(c.phone)], ['Город', c.city], ['Возраст', dash(c.age)], ['Размер одежды', dash(c.cloth)], ['Размер обуви', dash(c.shoe)], ['Рост', dash(c.h, ' см')]];
  var data = '<div>' + secH('О клиенте') + info.map(function (r) { return '<div class="rowline"><span class="t-label">' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + (c.note ? '<div class="rowline"><span class="t-label">Заметка</span><b style="text-align:right">' + esc(c.note) + '</b></div>' : '') + '</div>';
  var likes = cats.length ? '<div>' + secH('Что покупает') + '<div class="fchips wrap" style="padding-top:var(--s3)">' + cats.map(function (k) { return '<span class="chip chip-neutral">' + k + '</span>'; }).join('') + '</div></div>' : '';
  var hist = '<div>' + secH('История покупок', numSp(c.buys.length)) + (c.buys.length ? c.buys.slice().sort(function (a, b) { return a[0] - b[0]; }).map(function (b) {
    return '<div class="ln"><span class="name">' + DATA[b[1]].n + '</span><span class="qty">' + money(b[4] * EXTRA[b[1]].price) + '</span><span class="meta">' + dateOf(b[0]) + ' / ' + b[2] + ' / ' + SHOPS[b[3]] + (b[4] > 1 ? ' / ' + numSp('×' + b[4]) : '') + '</span></div>';
  }).join('') : '<div class="t-label" style="padding-top:var(--s3)">Покупок пока нет. Привяжите клиента к продаже на экране «Продажа».</div>') + '</div>';
  return '<section class="scr">' + backTo('clients', 'Клиенты', 'Назад к списку клиентов') + '<div class="t-h1">' + c.n + '</div>' + flashHtml() + '<div class="cols"><div class="scr">' + hero + acts + likes + hist + '</div><div class="scr">' + data + '</div></div></section>';
}
function clientFormHtml() {
  var x = st.cNew, d = phoneDigits(x.phone), okPhone = d.length === 10, dup = okPhone && st.clients.filter(function (c) { return c.id !== x.id && phoneDigits(c.phone) === d; })[0];
  var ok = x.n.trim().length >= 2 && okPhone && !dup, back = x.id ? 'client' : st.cliBack === 'sale' ? 'sale' : 'clients';
  var warn = dup ? '<div class="notice bad"><svg class="ic"><use href="#i-alert"/></svg><span>Клиент с таким телефоном уже есть: ' + esc(dup.n) + '.</span></div>' : x.phone && !okPhone ? '<div class="t-label">Нужно 10 цифр после +7, например 928 555-03-12.</div>' : '';
  var three = '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s2)">' + lblInput('Возраст', 'cage', x.age, '', ' inputmode="numeric"') + lblInput('Обувь', 'cshoe', x.shoe, '', ' inputmode="numeric"') + lblInput('Рост, см', 'ch', x.h, '', ' inputmode="numeric"') + '</div>';
  return '<section class="scr narrow">' + backTo(back, x.id ? 'Клиент' : back === 'sale' ? 'Продажа' : 'Клиенты', 'Назад') + '<div class="t-h1">' + (x.id ? 'Изменить клиента' : 'Новый клиент') + '</div>' +
    lblInput('Имя', 'cname', x.n, 'Например, Аслан Гаджиев', ' maxlength="30"') + lblInput('Телефон (по нему ищем клиента)', 'cphone', x.phone, '+7 928 555-00-00', ' inputmode="tel" maxlength="18"') + warn +
    lblInput('Город', 'ccity', x.city, 'Махачкала', ' maxlength="20"') +
    '<div style="display:grid;gap:var(--s2)"><span class="t-label">Размер одежды</span>' + chipsOf('data-cloth', CLOTH_SIZES.map(function (s) { return [s, s]; }), x.cloth) + '</div>' + three +
    lblInput('Заметка', 'cnote', x.note, 'Например, любит тёмные цвета', ' maxlength="60"') +
    '<button class="btn btn-main" data-csave' + disabledIf(ok) + '>' + (x.id ? 'Сохранить' : 'Добавить клиента') + '</button></section>';
}

