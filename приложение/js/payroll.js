// ▪ Файл js/payroll.js: зарплата сотрудников и автоматические расходы (из них считается прибыль). Подключается в index.html по порядку.
// ----- Зарплата: оклад + процент от личных продаж + бонус за план − аванс − штраф (ТЗ 8.5). Из неё считаются расходы -----
var isSeller = function (p) { return p.role === 'Старший продавец' || p.role === 'Продавец'; };
var rateOf = function (p) { return p.pct == null ? st.rules.pct : p.pct; };
var isOn = function (p) { return st.sched[0][6].indexOf(p.id) >= 0; };
var shopOf = function (p) { return p.shop === 'Все' ? 'все магазины' : p.shop; };
function staffSales() {   // личные продажи за 30 дней: выручка магазина делится по весам продавцов, последний забирает остаток
  var res = {};
  SHOP_BASE.forEach(function (b) {
    var team = st.staff.filter(function (p) { return p.shop === b[0] && isSeller(p) && p.share > 0; }), w = sum(team.map(function (p) { return p.share; })), left = b[1];
    team.forEach(function (p, i) { var v = i === team.length - 1 ? left : Math.round(b[1] * p.share / w / 100) * 100; res[p.id] = v; left -= v; });
  });
  return res;
}
function staffPay(p, sales) {
  var s = isSeller(p) ? (sales[p.id] || 0) : 0, pct = Math.round(s * rateOf(p) / 100);
  var base = SHOP_BASE.filter(function (b) { return b[0] === p.shop; })[0], plan = isSeller(p) && !!base && base[1] >= PLANS[p.shop], bonus = plan ? st.rules.bonus : 0;
  return { sales: s, pct: pct, bonus: bonus, plan: plan, total: p.salary + pct + bonus - p.adv - p.fine };
}
var staffPays = function () { var sales = staffSales(); return st.staff.map(function (p) { return staffPay(p, sales); }); };
// расходы, которые система записывает сама: зарплата по магазинам (аванс это часть зарплаты, штраф её уменьшает) и доставка
function autoExp() {
  var pays = staffPays(), by = {}, out = [];
  st.staff.forEach(function (p, i) { var k = SHOPS.indexOf(p.shop) >= 0 ? p.shop : 'Все'; by[k] = (by[k] || 0) + p.salary + pays[i].pct + pays[i].bonus - p.fine; });
  SHOPS.concat(['Все']).forEach(function (k, i) { if (by[k]) out.push({ id: 101 + i, ago: 0, n: k === 'Все' ? 'Зарплата, онлайн и доставка' : 'Зарплата, ' + k, cat: 'Зарплата', shop: k, amt: by[k], by: 'авто' }); });
  out.push({ id: 110, ago: 0, n: 'Доставка заказов: 168 по 250 ₽', cat: 'Доставка', shop: 'Все', amt: 42000, by: 'авто' });
  return out;
}
function expAll() { return st.exp.concat(autoExp()); }

