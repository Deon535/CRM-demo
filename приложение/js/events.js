// ▪ Файл js/events.js: реакция на нажатия, клавиши и ввод текста. Подключается в index.html по порядку.
document.addEventListener('click', function (e) {
  var t = e.target;
  if (t.closest('#side') && st.sb === 'collapsed' && st.peek && !t.closest('#sbIn')) pin();   // нажатие на выглянувшую панель закрепляет её
  var pk = t.closest('.pick[data-k]');
  if (pk) { var k = pk.dataset.k; if (k === 'sb') { st.sb = pk.dataset.val; st.peek = false; applySb(); } else { st[k] = pk.dataset.val; render(); } return; }
  if (t.closest('.pick[data-act="login"]')) { openLogin(true); return; }
  var sf = t.closest('[data-shift]'); if (sf) { st.shiftId = +sf.dataset.shift; st.shReason = null; goTo('shift'); return; }
  var sr = t.closest('[data-sreason]'); if (sr) { st.shReason = sr.dataset.sreason; render(); return; }
  if (t.closest('[data-sresolve]')) { if (!st.shReason) return; var sh0 = shById(st.shiftId); sh0.reason = st.shReason; st.flash = 'Расхождение закрыто, запись в журнале.'; st.shReason = null; render(); return; }
  var ss = t.closest('[data-scstep]'); if (ss) { st.sc.step = Math.max(1, Math.min(2, st.sc.step + +ss.dataset.scstep)); render(); return; }
  if (t.closest('[data-scadd]')) { st.sc.add = { amt: '', kind: null }; render(); return; }
  var sk = t.closest('[data-sckind]'); if (sk) { st.sc.add.kind = sk.dataset.sckind; render(); return; }
  if (t.closest('[data-scaddcancel]')) { st.sc.add = null; render(); return; }
  if (t.closest('[data-scaddsave]')) { var ad = st.sc.add; if (!(+digitsOf(ad.amt) > 0 && ad.kind)) return; st.sc.outs.push([ad.kind, +digitsOf(ad.amt), '20:45', SELLER_SHIFT.by]); st.sc.add = null; render(); return; }
  if (t.closest('[data-scclose]')) {
    if (!(+digitsOf(st.sc.amt) > 0)) return;
    var nid = Math.max.apply(null, st.shifts.map(function (x) { return x.id; })) + 1;
    st.shifts.unshift({ id: nid, shop: SELLER_SHIFT.shop, day: SELLER_SHIFT.day, by: SELLER_SHIFT.by, closed: SELLER_SHIFT.closed, start: SELLER_SHIFT.start, n1: SELLER_SHIFT.n1, sales1: SELLER_SHIFT.sales1, n2: SELLER_SHIFT.n2, sales2: SELLER_SHIFT.sales2, outs: st.sc.outs, counted: +digitsOf(st.sc.amt), reason: null });
    st.myClosed = true; goTo('cash'); return;
  }
  var oo = t.closest('[data-ord]'); if (oo) { st.ordId = +oo.dataset.ord; goTo('order'); return; }
  var ot = t.closest('[data-ordtab]'); if (ot) { st.ordTab = ot.dataset.ordtab; render(); return; }
  var oa = t.closest('[data-oact]');
  if (oa) {
    var og = ordById(st.ordId);
    if (oa.dataset.oact === 'next') { var nx = NEXT[og.st]; og.st = nx[0]; if (og.st === 'pay') { og.left = '24 ч'; og.urgent = false; } if (og.st === 'paid') og.prepaid = ordSum(og); if (og.st === 'way') og.courier = 'К1'; st.flash = nx[2]; }
    else { og.st = 'no'; og.reason = 'Клиент отказался'; st.flash = 'Заказ закрыт: клиент отказался.'; }
    render(); $('content').scrollTop = 0; return;
  }
  var cv = t.closest('[data-cpv]'); if (cv) { st.cp.val = cv.dataset.cpv; render(); return; }
  var cc = t.closest('[data-cp]');
  if (cc) {
    var cq = cc.dataset.cp.split(':'), cid = +cq[0], cact = cq[1], co = ordById(cid);
    if (cact === 'done') { if (ordCollect(co) === 0) { co.st = 'done'; co.pay = null; st.cp = null; } else st.cp = { id: cid, mode: 'pay', val: null }; }
    else if (cact === 'no') st.cp = { id: cid, mode: 'no', val: null };
    else if (cact === 'back') st.cp = null;
    else if (cact === 'confirm') { if (!st.cp || !st.cp.val) return; if (st.cp.mode === 'pay') { co.st = 'done'; co.pay = st.cp.val; } else { co.st = 'no'; co.reason = st.cp.val; } st.cp = null; }
    render(); return;
  }
  var tt = t.closest('[data-trtab]'); if (tt) { st.trTab = tt.dataset.trtab; render(); return; }
  var tr = t.closest('[data-tr]'); if (tr) { st.trId = +tr.dataset.tr; st.trGot = trById(st.trId).lines.map(function (l) { return l.sent; }); st.trOpen = false; goTo('transfer'); return; }
  if (t.closest('[data-tropen]')) { st.trOpen = true; render(); return; }
  var td = t.closest('[data-trdec],[data-trinc]');
  if (td) { var ti = +(td.dataset.trdec || td.dataset.trinc), tl = trById(st.trId).lines[ti]; st.trGot[ti] = Math.max(0, Math.min(tl.sent, st.trGot[ti] + (td.dataset.trinc !== undefined ? 1 : -1))); render(); return; }
  if (t.closest('[data-traccept]')) {
    var tx = trById(st.trId); tx.status = 'done'; tx.got = st.trGot.slice(); var tdd = trShort(tx, tx.got);
    st.flash = tdd.u ? 'Принято с расхождением: не хватило ' + tdd.u + ' шт на ' + money(tdd.s) + '. ' + (tdd.notify ? 'Владельцу отправлено уведомление.' : 'Расхождение разберёт старший продавец.') : 'Перемещение № ' + tx.id + ' принято.';
    st.trTab = 'done'; goTo('transfers'); return;
  }
  var nf = t.closest('[data-ntfrom]'); if (nf) { st.nt.from = nf.dataset.ntfrom; st.nt.qty = {}; if (st.nt.to === st.nt.from) st.nt.to = SHOP_OPTS.filter(function (s) { return s !== st.nt.from; })[0]; render(); return; }
  var nto = t.closest('[data-ntto]'); if (nto) { st.nt.to = nto.dataset.ntto; render(); return; }
  var nd = t.closest('[data-ntdec],[data-ntinc]');
  if (nd) { var nk = nd.dataset.ntdec || nd.dataset.ntinc, nr = stockRows(st.nt.from).filter(function (r) { return r.key === nk; })[0], nc = st.nt.qty[nk] || 0; st.nt.qty[nk] = Math.max(0, Math.min(nr.have, nc + (nd.dataset.ntinc !== undefined ? 1 : -1))); render(); return; }
  if (t.closest('[data-ntsend]')) {
    var lines = [];
    stockRows(st.nt.from).forEach(function (r) { var n = st.nt.qty[r.key] || 0; if (n) lines.push({ n: r.n, meta: r.size + ' / ' + r.color, sent: n, price: r.price }); });
    if (!lines.length) return;
    var nid = Math.max.apply(null, st.tr.map(function (x) { return x.id; })) + 1;
    st.tr.unshift({ id: nid, from: st.nt.from, to: st.nt.to, by: 'Вы', status: 'transit', got: null, lines: lines });
    st.flash = 'Перемещение № ' + nid + ' отправлено, статус «в пути».';
    st.trTab = st.role === 'Старший продавец' ? 'out' : 'transit'; goTo('transfers'); return;
  }
  var ri = t.closest('[data-ritem]'); if (ri) { st.ret.item = +ri.dataset.ritem; render(); return; }
  var rr = t.closest('[data-rreason]'); if (rr) { st.ret.reason = +rr.dataset.rreason; render(); return; }
  if (t.closest('[data-rtag]')) { st.ret.tag = !st.ret.tag; render(); return; }
  if (t.closest('[data-rsaid]')) { st.ret.said = !st.ret.said; render(); return; }
  var rm = t.closest('[data-rmode]'); if (rm) { st.ret.mode = rm.dataset.rmode; render(); return; }
  var rsb = t.closest('[data-rsort]'); if (rsb) { st.rsort = rsb.dataset.rsort; st.flash = ''; render(); return; }
  if (t.closest('[data-rexport]')) { st.flash = 'Демо: файл не создаётся. В настоящей системе здесь скачается таблица Excel.'; render(); return; }
  var xStub = t.closest('[data-stub]'); if (xStub) { st.flash = xStub.dataset.stub; render(); $('content').scrollTop = 0; return; }
  var xEc = t.closest('[data-expcat]'); if (xEc) { st.expCat = xEc.dataset.expcat; render(); return; }
  var xEn = t.closest('[data-expnewcat]'); if (xEn) { st.expNew.cat = xEn.dataset.expnewcat; render(); return; }
  if (t.closest('[data-expsave]')) {
    var xe = st.expNew, xa = +digitsOf(xe.amt); if (!(xa > 0 && xe.cat)) return;
    st.exp.push({ id: Math.max.apply(null, st.exp.map(function (x) { return x.id; })) + 1, ago: 0, n: xe.note.trim() || xe.cat, cat: xe.cat, shop: 'Все', amt: xa, by: 'Вы' });
    st.flash = 'Расход записан: ' + xe.cat + ', ' + money(xa) + '. Он уже учтён в отчёте «Прибыль» и на «Сегодня».'; goTo('expenses'); return;
  }
  var xCm = t.closest('[data-climode]'); if (xCm) { st.cliMode = xCm.dataset.climode; st.flash = ''; render(); return; }
  var xCs = t.closest('[data-cliseg]'); if (xCs) { st.cliSeg = xCs.dataset.cliseg; render(); return; }
  var xMs = t.closest('[data-msize]'); if (xMs) { st.mSize = xMs.dataset.msize; st.flash = ''; render(); return; }
  var xMc = t.closest('[data-mcat]'); if (xMc) { st.mCat = xMc.dataset.mcat; st.flash = ''; render(); return; }
  var xCl = t.closest('[data-client]'); if (xCl) { st.cliId = +xCl.dataset.client; st.flash = ''; goTo('client'); return; }
  var xCn = t.closest('[data-cnew]'); if (xCn) { st.cliBack = xCn.dataset.cnew; st.cNew = { id: null, n: '', phone: '', city: '', age: '', cloth: 'M', shoe: '', h: '', note: '' }; goTo('client-new'); return; }
  var xCe = t.closest('[data-cedit]'); if (xCe) { var c0 = clientById(+xCe.dataset.cedit); st.cNew = { id: c0.id, n: c0.n, phone: c0.phone, city: c0.city, age: c0.age ? String(c0.age) : '', cloth: c0.cloth, shoe: c0.shoe ? String(c0.shoe) : '', h: c0.h ? String(c0.h) : '', note: c0.note }; goTo('client-new'); return; }
  var xCz = t.closest('[data-cloth]'); if (xCz) { st.cNew.cloth = xCz.dataset.cloth; render(); return; }
  if (t.closest('[data-csave]')) {
    var cx = st.cNew, cd = phoneDigits(cx.phone);
    if (!(cx.n.trim().length >= 2 && cd.length === 10 && !st.clients.filter(function (c) { return c.id !== cx.id && phoneDigits(c.phone) === cd; })[0])) return;
    var rec = { n: cx.n.trim(), phone: fmtPhone(cx.phone), city: cx.city.trim() || 'Махачкала', age: +cx.age || 0, cloth: cx.cloth, shoe: +cx.shoe || 0, h: +cx.h || 0, note: cx.note.trim() };
    if (cx.id) { var cu = clientById(cx.id); for (var kf in rec) cu[kf] = rec[kf]; st.cliId = cx.id; st.flash = 'Данные клиента сохранены.'; goTo('client'); return; }
    rec.id = Math.max.apply(null, st.clients.map(function (c) { return c.id; })) + 1; rec.buys = []; st.clients.push(rec); st.cliId = rec.id;
    if (st.cliBack === 'sale') { st.sale.cid = rec.id; st.sale.q = ''; goTo('sale'); return; }
    st.flash = 'Клиент добавлен: ' + rec.n + '.'; goTo('client'); return;
  }
  var xMn = t.closest('[data-mseason]'); if (xMn) { st.cliSeason = xMn.dataset.mseason; st.flash = ''; render(); return; }
  var xSc = t.closest('[data-salecli]'); if (xSc) { st.sale.cid = +xSc.dataset.salecli; st.sale.q = ''; render(); return; }
  if (t.closest('[data-saleunlink]')) { st.sale.cid = null; render(); return; }
  if (t.closest('[data-saledone]')) { if (st.sale.cid) { var sc0 = clientById(st.sale.cid), si = Math.max(0, SHOPS.indexOf(cfg().shop)); sc0.buys.push([0, 0, 'M', si, 1], [0, 1, '50', si, 1]); } st.sale.done = true; render(); $('content').scrollTop = 0; return; }
  if (t.closest('[data-salenew]')) { st.sale = newSale(); render(); return; }
  if (t.closest('[data-pnew]')) { st.pEdit = { id: null, n: '', phone: '', role: 'Продавец', shop: 'Махачкала', salary: '', pct: st.rules.pct, age: '' }; goTo('person-edit'); return; }
  var xPd = t.closest('[data-pedit]'); if (xPd) { var p0 = st.staff.filter(function (p) { return p.id === +xPd.dataset.pedit; })[0]; st.pEdit = { id: p0.id, n: p0.n, phone: p0.phone, role: p0.role, shop: p0.shop, salary: String(p0.salary), pct: rateOf(p0), age: p0.age ? String(p0.age) : '' }; goTo('person-edit'); return; }
  var xPr = t.closest('[data-prole]'); if (xPr) { st.pEdit.role = xPr.dataset.prole; render(); return; }
  var xPs = t.closest('[data-pshop]'); if (xPs) { st.pEdit.shop = xPs.dataset.pshop; render(); return; }
  var xPp = t.closest('[data-ppct]'); if (xPp) { st.pEdit.pct = Math.max(0, Math.min(10, st.pEdit.pct + (+xPp.dataset.ppct))); render(); return; }
  if (t.closest('[data-psave]')) {
    var pe = st.pEdit; if (pe.n.trim().length < 2) return;
    var psel = pe.role === 'Старший продавец' || pe.role === 'Продавец', rec2 = { n: pe.n.trim(), phone: pe.phone.trim() ? fmtPhone(pe.phone) : '—', role: pe.role, shop: pe.shop, salary: +pe.salary || 0, age: +pe.age || 0, pct: pe.pct === st.rules.pct ? null : pe.pct };
    if (pe.id) {
      var pu = st.staff.filter(function (p) { return p.id === pe.id; })[0]; for (var kp in rec2) pu[kp] = rec2[kp]; if (psel && !(pu.share > 0)) pu.share = 0.3;
      st.log.unshift([0, '18:00', 'Вы', 'hr', 'Изменил данные сотрудника: ' + pu.n]); st.personId = pe.id; st.flash = 'Данные сохранены. Зарплата, расходы и прибыль пересчитаны.'; goTo('person'); return;
    }
    rec2.id = Math.max.apply(null, st.staff.map(function (p) { return p.id; })) + 1; rec2.since = 'ноябрь 2026'; rec2.share = psel ? 0.3 : 0; rec2.adv = 0; rec2.fine = 0; st.staff.push(rec2);
    [0, 1].forEach(function (w) { [0, 1, 2, 3, 4].forEach(function (d) { st.sched[w][d].push(rec2.id); }); });
    st.log.unshift([0, '18:00', 'Вы', 'hr', 'Добавил сотрудника: ' + rec2.n + ', ' + rec2.role.toLowerCase()]); st.personId = rec2.id; st.pMoney = { kind: 'adv', amt: '' }; st.flash = 'Сотрудник добавлен, смены с понедельника по пятницу поставлены в график.'; goTo('person'); return;
  }
  var xPk = t.closest('[data-pmkind]'); if (xPk) { st.pMoney.kind = xPk.dataset.pmkind; render(); return; }
  if (t.closest('[data-pmsave]')) {
    var pa = +digitsOf(st.pMoney.amt); if (!(pa > 0)) return;
    var pp0 = st.staff.filter(function (p) { return p.id === st.personId; })[0], isAdv = st.pMoney.kind === 'adv'; pp0[isAdv ? 'adv' : 'fine'] += pa;
    st.log.unshift([0, '18:00', 'Вы', 'hr', (isAdv ? 'Аванс ' : 'Штраф ') + pp0.n + ': ' + money(pa)]); st.flash = (isAdv ? 'Аванс' : 'Штраф') + ' записан: ' + money(pa) + '. К выплате и расходы пересчитаны.'; st.pMoney.amt = ''; render(); $('content').scrollTop = 0; return;
  }
  var xSw = t.closest('[data-schweek]'); if (xSw) { st.schWeek = +xSw.dataset.schweek; render(); return; }
  var xSd = t.closest('[data-schday]'); if (xSd) { st.schDay = +xSd.dataset.schday; render(); return; }
  var xWk = t.closest('[data-swork]'); if (xWk) { var wid = +xWk.dataset.swork, wl = st.sched[st.schWeek][st.schDay], wi = wl.indexOf(wid); if (wi >= 0) wl.splice(wi, 1); else wl.push(wid); render(); return; }
  if (t.closest('[data-hold]')) { st.holdN++; st.flash = 'Забронировано: ' + DATA[st.product].n + ' на ' + st.rules.hold + ' ' + plural(st.rules.hold, 'день', 'дня', 'дней') + ', до ' + dateOf(-st.rules.hold) + '. Бронь видна в «Мои брони».'; render(); $('content').scrollTop = 0; return; }
  var xPt = t.closest('[data-ptab]'); if (xPt) { st.pTab = xPt.dataset.ptab; render(); return; }
  var xPe = t.closest('[data-person]'); if (xPe) { st.personId = +xPe.dataset.person; st.flash = ''; st.pMoney = { kind: 'adv', amt: '' }; goTo('person'); return; }
  var xLf = t.closest('[data-logf]'); if (xLf) { st.logF = xLf.dataset.logf; render(); return; }
  var xSe = t.closest('[data-set]'); if (xSe) { st.setId = xSe.dataset.set; goTo('setting'); return; }
  var xRu = t.closest('[data-rule]');
  if (xRu) { var xp = xRu.dataset.rule.split(':'), xd = RULE_ROWS.filter(function (r) { return r[0] === xp[0]; })[0]; st.rules[xp[0]] = Math.max(xd[2], Math.min(xd[3], st.rules[xp[0]] + (+xp[1]) * xd[4])); render(); return; }
  if (t.closest('[data-rulesreset]')) { st.rules = cloneRules(); render(); return; }
  var xRs = t.closest('[data-rolesel]'); if (xRs) { st.roleSel = xRs.dataset.rolesel; render(); return; }
  var xTg = t.closest('[data-tog]'); if (xTg) { var xt = xTg.dataset.tog.split(':'); st[xt[0]][+xt[1]] = !st[xt[0]][+xt[1]]; render(); return; }
  var pr = t.closest('[data-product]'); if (pr) { st.product = +pr.dataset.product; goTo('product'); return; }
  var go = t.closest('[data-go]'); if (go) { goTo(go.dataset.go); return; }
  if (t.closest('[data-back]')) { goTo(st.prev || 'today'); return; }
  var sh = t.closest('[data-shop]'); if (sh) { st.shop = sh.dataset.shop; if (st.screen !== 'products' && st.screen !== 'cash') st.screen = 'products'; render(); return; }
  var ct = t.closest('[data-cat]'); if (ct) { st.cat = ct.dataset.cat; render(); return; }
  if (t.closest('#userBtn')) { openLogin(true); return; }
  if (t.closest('#loginBack') || t.closest('#loginX')) { if (loginClosable()) openLogin(false); return; }
  if (t.closest('#rpBtn')) { var o = $('rpList').classList.toggle('open'); $('rpBtn').setAttribute('aria-expanded', o); return; }
  var ro = t.closest('[data-role]'); if (ro) { pendingRole = ro.dataset.role; renderRoles(); $('rpList').classList.remove('open'); $('rpBtn').setAttribute('aria-expanded', 'false'); return; }
  if (t.closest('[data-login]')) { openLogin(true); return; }
  if (t.closest('#doLogout')) { doLogout(); return; }
  if (t.closest('#doLogin') && SERVER.on) { submitLogin(); return; }
  if (t.closest('#doLogin')) { st.role = pendingRole; st.screen = cfg().home; st.prev = st.screen; st.shop = 'Все'; openLogin(false); render(); return; }
  if (t.closest('#reset')) { var keep = { w: st.w, t: st.t, sb: st.sb }; st = init(); st.w = keep.w; st.t = keep.t; st.sb = keep.sb; $('q').value = ''; render(); return; }
  var sg = t.closest('.seg button'); if (sg) { sg.parentElement.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === sg); }); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('#login')) { e.preventDefault(); $('doLogin').click(); return; }
  if (e.key !== 'Escape') return;
  if ($('login').classList.contains('open')) { if (loginClosable()) openLogin(false); }
  else if (st.peek) setPeek(false);
});
document.addEventListener('input', function (e) {
  var kin = e.target.dataset && e.target.dataset.in;
  if (kin) {
    var dv = digitsOf(e.target.value).slice(0, 7);
    if (kin === 'scamt') st.sc.amt = dv; else if (kin === 'scadd') st.sc.add.amt = dv;
    else if (TEXT_IN[kin]) { var ti = TEXT_IN[kin]; (ti[0] ? st[ti[0]] : st)[ti[1]] = e.target.value; }
    else if (NUM_IN[kin]) { var ni = NUM_IN[kin]; (ni[0] ? st[ni[0]] : st)[ni[1]] = digitsOf(e.target.value).slice(0, ni[2]); }
    render(); var ek = $(e.target.id); if (ek) { ek.focus(); var kn = ek.value.length; ek.setSelectionRange(kn, kn); }
    return;
  }
  if (e.target.id !== 'ntq') return;
  st.nt.q = e.target.value; render();
  var el = $('ntq'); if (el) { el.focus(); var n = el.value.length; el.setSelectionRange(n, n); }
});
$('q').addEventListener('input', function () { st.q = this.value; if (st.q.trim() && cfg().search) st.screen = 'products'; render(); });

