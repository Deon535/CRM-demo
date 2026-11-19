// ▪ Файл js/api.js: разговор экрана с сервером (адреса /api/...). Подключается в index.html по порядку.
// SERVER.on: есть ли сервер (страница открыта по http и сервер отвечает). Если нет (двойной щелчок по index.html), экран работает как демо.
var SERVER = { on: false, user: null };

// Задать серверу вопрос. Возвращает { status: код ответа, data: ответ }. Пропуск (cookie) браузер прикладывает сам.
function apiCall(method, path, body) {
  return fetch(path, {
    method: method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data }; });
  });
}

// ===== Каталог товаров =====
// «белый / S–XL»: цвет и диапазон размеров одной строкой (так подписан товар в списке)
function metaOf(color, sizes) {
  if (!sizes.length) return color;
  var lo = sizes[0].split('–')[0], hi = sizes[sizes.length - 1].split('–').pop();
  return color + ' / ' + (lo === hi ? lo : lo + '–' + hi);
}

// SHOP_IDS: настоящие номера магазинов (в том же порядке, что SHOPS). VAR_AT: номер размера в базе -> [номер товара в DATA, номер размера в строке].
// Они нужны продаже: серверу говорим номера размеров, а после продажи по ним обновляем остаток на экране.
var SHOP_IDS = [], VAR_AT = {};

// Берёт каталог с сервера и кладёт туда, откуда экраны читают товар: DATA, EXTRA, SHOPS, CHIPS, CATS (см. data.js).
// Закупка (cost) в EXTRA появляется, только если сервер её прислал, то есть если у роли есть право на закупочные цены.
function loadCatalog() {
  return apiCall('GET', '/api/products').then(function (r) {
    if (r.status !== 200) throw new Error('catalog ' + r.status);
    var c = r.data;
    SHOPS = c.shops; SHOP_IDS = c.shopIds;
    VAR_AT = {};
    c.items.forEach(function (it, i) { it.variantIds.forEach(function (v, j) { VAR_AT[v] = [i, j]; }); });
    CHIPS = ['Все'].concat(SHOPS, ['Склад']);
    CATS = ['Все'].concat(c.categories);
    DATA = c.items.map(function (it) {
      return { id: it.id, n: it.name, cat: it.category, meta: metaOf(it.color, it.sizes), price: money(Math.round(it.priceKopecks / 100)), rows: it.rows };
    });
    EXTRA = c.items.map(function (it) {
      var x = { art: it.article, sizes: it.sizes, price: Math.round(it.priceKopecks / 100), priceK: it.priceKopecks, variantIds: it.variantIds, holds: it.holds };
      if (it.costKopecks != null) x.cost = Math.round(it.costKopecks / 100);
      return x;
    });
  });
}

// Выход или роль без доступа к товару: каталог из памяти убираем
function clearCatalog() { DATA = []; EXTRA = []; SHOP_IDS = []; VAR_AT = {}; }

// Сервер сказал, сколько «доступно» по размеру в магазине (после продажи или при нехватке): обновляем остаток на экране
function catalogAvail(shopName, variantId, available) {
  var at = VAR_AT[variantId], si = SHOPS.indexOf(shopName);
  if (at && si >= 0 && DATA[at[0]]) DATA[at[0]].rows[si][at[1]] = available;
}

// Есть ли сервер? Спрашиваем адрес «жив ли сервер»
function serverProbe() {
  if (!/^https?:$/.test(location.protocol)) return Promise.resolve(false);
  return apiCall('GET', '/api/health').then(function (r) { return r.status === 200 && r.data.ok === true; }).catch(function () { return false; });
}
