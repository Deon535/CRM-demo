// ▪ Файл js/screens/returns.js: экран «Возврат». Подключается в index.html по порядку.
// ===== Экран «Возврат»: образец «Из чека» (веер 5). Демо: чек 9 дней назад, оплата картой, без скидки =====
var RET = [
  { n: 'Рубашка Oxford', meta: 'M / рост 182 / белый', p: 4990 },
  { n: 'Брюки чинос', meta: '50 / синий', p: 5490 },
  { n: 'Носки хлопок', meta: '39–42 / хлопок', p: 390 }
];
var REASONS = ['Не подошёл размер', 'Передумал', 'Брак'];
var RET_DAYS = 9;
function returnHtml() {
  var r = st.ret, it = RET[r.item], shop = cfg().shop || 'Махачкала';
  var term = r.reason === 2 ? st.rules.retDefect : st.rules.retDays;
  var selfOk = st.role !== 'Продавец' || it.p <= 3000;
  var ok = r.tag && (r.mode === 'check' || r.said);
  var lines = RET.map(function (x, i) {
    return '<button class="cl" data-ritem="' + i + '" aria-pressed="' + (i === r.item) + '"><span class="rad"></span><span class="name">' + x.n + '</span><span class="price">' + money(x.p) + '</span><span class="meta">' + x.meta + '</span></button>';
  }).join('');
  var reasons = '<div style="display:grid;gap:var(--s2)"><div class="sec-h"><span class="t-h2">Причина</span></div><div class="rs">' + REASONS.map(function (t, i) { return '<button data-rreason="' + i + '" aria-pressed="' + (i === r.reason) + '">' + t + '</button>'; }).join('') + '</div></div>';
  var tag = '<button class="tog" data-rtag aria-pressed="' + r.tag + '"><span class="box"><svg class="ic"><use href="#i-check"/></svg></span>С биркой и не ношена</button>';
  var left;
  if (r.mode === 'check') {
    left = '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input value="№ 2418" aria-label="Номер чека или телефон клиента" autocomplete="off"><svg class="ic"><use href="#i-scan"/></svg></label>' +
      '<div class="chk"><div class="chk-h"><span class="t-h2">Чек № <span class="num">2418</span></span><span class="chip chip-neutral"><span class="num">' + RET_DAYS + '</span> дней назад</span></div><div class="t-label">Оплата: карта / без скидки</div>' + lines + '</div>' +
      '<div class="rowline"><span class="t-label">Срок возврата</span><span class="chip chip-good">осталось <span class="num">' + (term - RET_DAYS) + '</span> из <span class="num">' + term + '</span></span></div>' +
      '<button class="linkbtn" data-rmode="item">Чека нет, найти по вещи</button>';
  } else {
    left = '<label class="field"><svg class="ic"><use href="#i-search"/></svg><input placeholder="Название, артикул или код" aria-label="Поиск вещи" autocomplete="off"><svg class="ic"><use href="#i-scan"/></svg></label>' +
      '<div class="chk"><div class="chk-h"><span class="t-h2">Найдено по коду</span></div><div class="t-label">Дату покупки система не знает</div>' + lines + '</div>' +
      '<button class="tog" data-rsaid aria-pressed="' + r.said + '"><span class="box"><svg class="ic"><use href="#i-check"/></svg></span>Клиент говорит: прошло не больше <span class="num">' + term + '</span> дней</button>' +
      '<button class="linkbtn" data-rmode="check">Есть чек: найти по номеру</button>';
  }
  left += reasons + tag;
  var outcome = '<div class="t-label">' + (r.reason === 2 ? 'Вещь пойдёт в списание.' : 'Вещь вернётся в остатки: ' + shop + '.') + '</div>';
  var notice = '<div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>' + (st.role !== 'Продавец' ? 'Возврат подтверждаете вы. Запись попадёт в журнал.' :
    selfOk ? 'До <span class="num">' + money(3000) + '</span> можно оформить самому, если старшего продавца нет в смене. Запись попадёт в журнал.' :
    'Больше <span class="num">' + money(3000) + '</span>: возврат подтверждает старший продавец. Вы отправляете ему заявку.') + '</span></div>';
  var hero = '<div class="hero-sum"><div class="t-label">Вернуть клиенту</div><div class="hero-num">' + money(it.p) + '</div><div class="t-label" style="margin-top:var(--s2)">на карту, так клиент платил</div></div>';
  var hint = !r.tag ? 'Без бирки и после носки возврат не принимается' : (!ok ? 'Без подтверждения срока клиентом возврат не оформить' : '');
  var btn = '<button class="btn btn-main"' + (ok ? '' : ' style="opacity:.4"') + '>' + (selfOk ? 'Оформить возврат' : 'Отправить старшему') + '</button>' + (hint ? '<div class="t-label bad" style="text-align:center">' + hint + '</div>' : '');
  return '<section class="scr"><div class="sale-head"><div class="t-h1">Возврат</div><button class="iconbtn" data-back aria-label="Закрыть возврат"><svg class="ic"><use href="#i-close"/></svg></button></div>' +
    '<div class="cols"><div style="display:grid;gap:var(--s4);align-content:start">' + left + '</div><div style="display:grid;gap:var(--s4);align-content:start">' + outcome + notice + hero + btn + '</div></div></section>';
}

