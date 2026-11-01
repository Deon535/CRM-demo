// ▪ Файл js/screens/orders.js: экраны «Заказы»: список по стадиям и карточка заказа. Подключается в index.html по порядку.
// ===== Заказы: список по стадиям (веер 7, вариант 1), карточка заказа =====
var ORD_GROUPS = [['new', 'Новые', ['new', 'chat']], ['pay', 'Ждут оплаты', ['pay']], ['ready', 'К отправке', ['paid']], ['way', 'В пути', ['way']], ['closed', 'Закрытые', ['done', 'no']]];
var STAGE_CHIP = { new: ['новая', 'neutral'], chat: ['в переписке', 'neutral'], pay: ['ждёт оплаты', 'neutral'], paid: ['оплачено', 'good'], way: ['в пути', 'neutral'], done: ['доставлено', 'good'], no: ['отказ', 'bad'] };
var STEPS = ['Новая', 'Переписка', 'Оплата', 'Оплачено', 'В пути', 'Доставлено'];
var STEP_OF = { new: 0, chat: 1, pay: 2, paid: 3, way: 4, done: 5 };
var NEXT = { new: ['chat', 'Взять в работу', 'Заказ взят в работу.'], chat: ['pay', 'Забронировать', 'Вещи забронированы, заказ ждёт оплаты (1 день).'], pay: ['paid', 'Отметить оплату', 'Оплата отмечена.'], paid: ['way', 'Передать курьеру', 'Заказ передан курьеру.'] };
var ordSum = function (o) { return o.lines.reduce(function (a, l) { return a + l.qty * l.price; }, 0); };
var ordCollect = function (o) { return ordSum(o) - o.prepaid; };
var ordText = function (o) { return o.lines.map(function (l) { return l.n + ' ' + l.meta.split(' / ')[0] + (l.qty > 1 ? ' ×' + l.qty : ''); }).join(', '); };
var ordTel = function (o) { return '+7928555' + '01' + ('0' + (o.id % 100)).slice(-2); };
var ordPhone = function (o) { return '+7 928 555-01-' + ('0' + (o.id % 100)).slice(-2); };
var ordById = function (id) { return st.ord.filter(function (o) { return o.id === id; })[0]; };
var inGroup = function (g) { var set = ORD_GROUPS.filter(function (x) { return x[0] === g; })[0][2]; return st.ord.filter(function (o) { return set.indexOf(o.st) >= 0; }); };
function stageChip(o) { var x = STAGE_CHIP[o.st]; return '<span class="chip chip-' + (o.st === 'pay' && o.urgent ? 'bad' : x[1]) + '">' + x[0] + '</span>'; }

function ordersListHtml() {
  var chips = '<div class="fchips wrap">' + ORD_GROUPS.map(function (x) { return '<button class="fchip" data-ordtab="' + x[0] + '" aria-pressed="' + (x[0] === st.ordTab) + '">' + x[1] + ' <span class="num">' + inGroup(x[0]).length + '</span></button>'; }).join('') + '</div>';
  var rows = inGroup(st.ordTab);
  var list = rows.length ? '<div>' + rows.map(function (o) {
    var more = o.st === 'pay' && o.left ? ' / <span class="' + (o.urgent ? 'bad' : '') + '">осталось <span class="num">' + o.left + '</span></span>' : '';
    return '<button class="prow" data-ord="' + o.id + '"><span><b>№ ' + o.id + ' / ' + o.who + '</b><span class="sub">' + ordText(o) + '</span><span class="sub">' + o.city + more + '</span></span><span class="r"><span class="price">' + money(ordSum(o)) + '</span>' + stageChip(o) + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('') + '</div>' : '<div class="empty"><svg class="ic"><use href="#i-truck"/></svg><div class="t-h2">Здесь пока пусто</div><p>Заказы этой стадии появятся здесь.</p></div>';
  return flashHtml() + chips + list;
}

function orderHtml() {
  var o = ordById(st.ordId), act = st.role === 'Онлайн-менеджер' || st.role === 'Владелец', sum = ordSum(o), step = STEP_OF[o.st];
  var back = '<div class="top-row"><button class="iconbtn" data-go="orders" aria-label="Назад к списку"><svg class="ic"><use href="#i-chevron-left"/></svg></button><span class="t-label">Заказы</span></div>';
  var progress = o.st === 'no' ? '' : '<div class="prog">' + STEPS.map(function (s, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('') + '</div><div class="t-label">Шаг <span class="num">' + (step + 1) + '</span> из <span class="num">6</span>: ' + STEPS[step].toLowerCase() + '</div>';
  var info = '<div><div class="sec-h"><span class="t-h2">Заказ № <span class="num">' + o.id + '</span></span>' + stageChip(o) + '</div>' +
    '<div class="rowline"><span class="t-label">Клиент</span><b>' + o.who + '</b></div>' +
    '<div class="rowline"><span class="t-label">Телефон</span><b class="num">' + ordPhone(o) + '</b></div>' +
    '<div class="rowline"><span class="t-label">Адрес</span><b>' + o.city + ', ' + o.addr + '</b></div>' +
    '<div class="rowline"><span class="t-label">Из магазина</span><b>' + o.city + '</b></div>' +
    (o.courier ? '<div class="rowline"><span class="t-label">Курьер</span><b>' + (st.role === 'Курьер' && o.courier === 'К1' ? 'Вы' : 'Курьер ' + o.courier.slice(1)) + '</b></div>' : '') +
    '<div class="rowline"><span class="t-label">Доставка курьеру</span><b class="num">' + money(250) + '</b></div></div>';
  var items = '<div><div class="sec-h"><span class="t-h2">Что в заказе</span><span class="t-label"><span class="num">' + o.lines.reduce(function (a, l) { return a + l.qty; }, 0) + '</span> шт</span></div>' +
    o.lines.map(function (l) { return '<div class="rowline"><span>' + l.n + '<br><span class="t-label">' + l.meta + (l.qty > 1 ? ' / <span class="num">' + l.qty + '</span> шт' : '') + '</span></span><b class="num">' + money(l.qty * l.price) + '</b></div>'; }).join('') +
    '<div class="rowline"><span class="t-label">Итого</span><b class="num" style="font-size:20px">' + money(sum) + '</b></div>' +
    '<div class="rowline"><span class="t-label">Оплата</span>' + (o.prepaid >= sum ? '<span class="chip chip-good">оплачено заранее</span>' : o.prepaid ? '<span><span class="chip chip-good">предоплата ' + money(o.prepaid) + '</span> ' + '<span class="chip chip-neutral">при получении ' + money(ordCollect(o)) + '</span></span>' : '<span class="chip chip-neutral">при получении</span>') + '</div></div>';
  var prepay = (sum > st.rules.prepay || o.city !== 'Махачкала') && (o.st === 'chat' || o.st === 'pay') ? '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Предоплата обязательна: ' + (o.city !== 'Махачкала' ? 'другой город' : 'сумма больше <span class="num">' + money(st.rules.prepay) + '</span>') + '.</span></div>' : '';
  var call = '<a class="btn btn-second btn-sm" href="tel:' + ordTel(o) + '"><svg class="ic"><use href="#i-phone"/></svg>Позвонить</a>';
  var tail;
  if (o.st === 'done') tail = '<div class="chip chip-good" style="justify-self:start">Доставлено' + (o.pay ? ', ' + o.pay.toLowerCase() : '') + '</div>';
  else if (o.st === 'no') tail = '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Отказ: ' + (o.reason || '').toLowerCase() + '. Вещь вернулась в магазин, продавец оформляет возврат.</span></div>';
  else if (o.st === 'way') tail = '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>Заказ у курьера. Доставку и оплату он отметит сам.</span></div>';
  else if (!act) tail = '';
  else {
    var nx = NEXT[o.st];
    tail = '<button class="btn btn-main" data-oact="next">' + nx[1] + '</button>' + (o.st === 'paid' ? '' : '<button class="linkbtn" style="justify-self:center" data-oact="cancel">Клиент отказался</button>');
  }
  return '<section class="scr">' + back + flashHtml() + '<div class="t-h1">' + o.who + '</div>' + progress + info + items + prepay + call + tail + '</section>';
}

