// ▪ Файл js/state.js: «тетрадь» демо: начальное состояние st, сброс init(), права ролей. Подключается в index.html по порядку.
var initRet = function () { return { item: 1, reason: 0, tag: true, said: true, mode: 'check' }; };
var init = function () { return { w: 'phone', t: 'light', sb: 'pinned', peek: false, screen: 'today', prev: 'today', shop: 'Все', cat: 'Все', role: 'Владелец', q: '', product: 0, ret: initRet(), tr: cloneTr(), trTab: null, trId: 118, trGot: null, trOpen: false, nt: null, flash: '', ord: cloneOrd(), ordTab: 'new', ordId: null, cp: null, shifts: cloneShifts(), myClosed: false, sc: null, shiftId: null, rsort: null, exp: cloneExp(), staff: cloneStaff(), clients: cloneClients(), log: cloneLog(), sched: schedBuild(), sale: newSale(), cNew: null, cliBack: 'clients', cliSeason: 'Все', pEdit: null, pMoney: { kind: 'adv', amt: '' }, schWeek: 0, schDay: 6, holdN: 0, expCat: 'Все', expNew: null, cliMode: 'list', cliSeg: 'all', cliQ: '', cliId: 1, mSize: 'Все', mCat: 'Все', pTab: 'staff', personId: 1, logF: 'Все', rules: cloneRules(), shopName: '', setId: null, roleSel: 'Владелец', mods: MODULES.map(function (m) { return m[2]; }), types: TYPES.map(function (m) { return m[2]; }) }; };
var st = init();
var pendingRole = 'Владелец';
var $ = function (id) { return document.getElementById(id); };
var frame = $('frame');
var todayHtml = document.getElementById('tpl-today').innerHTML;

function cfg() { return ROLE[st.role]; }
function allowed(s) { var c = cfg(); s = SUB_OF[s] || s; if (s === 'product') s = 'products'; if (s === 'order') s = 'orders'; if (s === 'shift' || s === 'shift-close') s = 'cash'; if (s === 'transfer' || s === 'transfer-new') s = 'transfers'; return c.tabs.indexOf(s) >= 0 || c.side.indexOf(s) >= 0; }

