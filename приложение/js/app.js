// ▪ Файл js/app.js: выбор экрана, перерисовка render(), боковая панель, переходы между экранами. Подключается в index.html по порядку.
function screenHtml() {
  if (st.screen === cfg().home) return '<section class="scr"><div class="t-h1">' + ITEMS[st.screen][0] + '</div>' + homeHtml() + '</section>';
  if (st.screen === 'sale') return saleScreenHtml();
  if (st.screen === 'products') return '<section class="scr"><div class="t-h1">Товар</div>' + productsHtml() + '</section>';
  if (st.screen === 'product') return productHtml();
  if (st.screen === 'return') return returnHtml();
  if (st.screen === 'cash') return cashHtml();
  if (st.screen === 'shift') return shiftHtml();
  if (st.screen === 'shift-close') return shiftCloseHtml();
  if (st.screen === 'orders') return '<section class="scr"><div class="t-h1">Заказы</div>' + ordersListHtml() + '</section>';
  if (st.screen === 'order') return orderHtml();
  if (st.screen === 'transfers') return transfersHtml();
  if (st.screen === 'transfer') return transferHtml();
  if (st.screen === 'transfer-new') return newTransferHtml();
  if (st.screen === 'reports') return reportsHtml();
  if (st.screen === 'expenses') return expensesHtml();
  if (st.screen === 'expense-new') return expenseNewHtml();
  if (st.screen === 'clients') return clientsHtml();
  if (st.screen === 'client') return clientHtml();
  if (st.screen === 'people') return peopleHtml();
  if (st.screen === 'person') return personHtml();
  if (st.screen === 'client-new') return clientFormHtml();
  if (st.screen === 'person-edit') return personFormHtml();
  if (st.screen === 'settings') return settingsHtml();
  if (st.screen === 'setting') return settingHtml();
  if (st.screen === 'more') return moreHtml();
  return '<section class="scr"><div class="t-h1">' + ITEMS[st.screen][0] + '</div><div class="empty"><svg class="ic"><use href="#i-box"/></svg><div class="t-h2">Экран ещё не нарисован</div><p>Этот раздел нарисуем на этапе интерфейса по готовой дизайн-системе.</p></div></section>';
}

function applySb() {
  frame.dataset.sb = st.sb;
  if (st.peek && st.sb === 'collapsed') frame.setAttribute('data-peek', ''); else frame.removeAttribute('data-peek');
  $('side').inert = (st.sb === 'collapsed' && !st.peek) || st.w === 'phone';
  $('sbOut').inert = st.sb !== 'collapsed' || st.w === 'phone';
  document.querySelectorAll('.pick[data-k="sb"]').forEach(function (b) { b.setAttribute('aria-pressed', st.sb === b.dataset.val); });
}

function render() {
  repRebuild();
  document.documentElement.dataset.theme = st.t;
  $('brand').textContent = st.shopName || 'CRM';
  frame.dataset.w = st.w;
  var c = cfg();
  if (!allowed(st.screen)) st.screen = c.home;
  $('roleLabel').textContent = st.role;
  $('saleBar').hidden = !c.bar || st.screen === 'sale';
  $('saleBtnD').hidden = !c.bar || st.screen === 'sale';
  $('q').closest('.field').hidden = !c.search;
  $('shopChips').hidden = c.side.indexOf('products') < 0;
  $('shopChips').innerHTML = CHIPS.map(function (c) { return '<button class="fchip" data-shop="' + c + '" aria-pressed="' + (c === st.shop) + '">' + c + '</button>'; }).join('');
  var cur = st.screen === 'product' ? 'products' : st.screen === 'order' ? 'orders' : /^shift/.test(st.screen) ? 'cash' : /^transfer/.test(st.screen) ? 'transfers' : st.screen, g = '', side = '';
  if (SUB_OF[st.screen]) cur = SUB_OF[st.screen];
  c.side.forEach(function (id) {
    var n = ITEMS[id];
    if (n[2] !== g) { g = n[2]; side += '<div class="nav-g">' + g + '</div>'; }
    side += '<button class="nav-i" data-go="' + id + '"' + (id === cur ? ' aria-current="page"' : '') + '><svg class="ic"><use href="#' + n[1] + '"/></svg>' + n[0] + '</button>';
  });
  $('sideNav').innerHTML = side;
  $('tabbar').style.gridTemplateColumns = 'repeat(' + c.tabs.length + ', minmax(0, 1fr))';
  $('tabbar').innerHTML = c.tabs.map(function (id) { var n = ITEMS[id]; return '<button class="tab" data-go="' + id + '"' + (id === cur ? ' aria-current="page"' : '') + '><svg class="ic"><use href="#' + n[1] + '"/></svg>' + n[0] + '</button>'; }).join('');
  var sc = $('content').scrollTop;
  $('content').innerHTML = screenHtml();
  $('content').scrollTop = sc;
  document.querySelectorAll('.pick[data-k="w"],.pick[data-k="t"]').forEach(function (b) { b.setAttribute('aria-pressed', st[b.dataset.k] === b.dataset.val); });
  applySb();
}
function renderRoles() {
  $('rpInner').innerHTML = ROLE_NAMES.map(function (r) { return '<button class="opt" data-role="' + r + '" aria-pressed="' + (r === pendingRole) + '">' + r + '<svg class="ic"><use href="#i-check"/></svg></button>'; }).join('');
  $('rpVal').textContent = pendingRole;
}
function openLogin(open) {
  $('login').classList.toggle('open', open);
  if (open) { pendingRole = st.role; renderRoles(); if (SERVER.on) renderLoginMode(); $('rpList').classList.remove('open'); $('rpBtn').setAttribute('aria-expanded', 'false'); setTimeout(function () { $('login').querySelector('.inp').focus(); }, 60); }
  else $('userBtn').focus();
}
function goTo(name) { if ((name === 'sale' || name === 'return') && st.screen !== name && st.screen !== 'client-new') st.prev = st.screen; if (name === 'sale' && st.screen !== 'sale' && st.screen !== 'client-new' && st.sale.done) st.sale = newSale(); if (name === 'return' && st.screen !== 'return') st.ret = initRet(); if (name === 'transfer-new' && st.screen !== 'transfer-new') st.nt = newNt(); if (name === 'shift-close' && st.screen !== 'shift-close') st.sc = newSc(); if (name === 'expense-new' && st.screen !== 'expense-new') st.expNew = { cat: null, amt: '', note: '' }; if (!/^(transfer|order|shift|cash|expenses|client|pers)/.test(name)) st.flash = ''; st.screen = name; render(); $('content').scrollTop = 0; }

// боковая панель: закрепить, скрыть, выглянуть по наведению
var hideT = null, noPeek = false, noPeekT = null;
function setPeek(v) { if (st.sb !== 'collapsed') v = false; if (st.peek === v) return; st.peek = v; applySb(); }
function pin() { st.sb = 'pinned'; st.peek = false; applySb(); }
// после нажатия «скрыть» курсор остаётся над квадратиком: не выглядываем, пока он не уйдёт (или не пройдёт 1,2 с)
function collapse() { st.sb = 'collapsed'; st.peek = false; noPeek = true; clearTimeout(noPeekT); noPeekT = setTimeout(function () { noPeek = false; }, 1200); applySb(); }
$('sbOut').addEventListener('mouseenter', function () { if (noPeek) return; clearTimeout(hideT); setPeek(true); });
$('sbOut').addEventListener('mouseleave', function () { noPeek = false; clearTimeout(noPeekT); hideT = setTimeout(function () { setPeek(false); }, 220); });
$('side').addEventListener('mouseenter', function () { clearTimeout(hideT); });
$('side').addEventListener('mouseleave', function () { hideT = setTimeout(function () { setPeek(false); }, 220); });
$('sbOut').addEventListener('focus', function () { if (!noPeek) setPeek(true); });
// квадратик внутри панели: у закреплённой скрывает, у выехавшей по наведению закрепляет
$('sbIn').addEventListener('click', function () { if (st.sb === 'collapsed' && st.peek) pin(); else collapse(); });
$('sbOut').addEventListener('click', pin);

