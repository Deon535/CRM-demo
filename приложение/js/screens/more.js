// ▪ Файл js/screens/more.js: экран «Ещё». Подключается в index.html по порядку.
function moreHtml() {
  var c = cfg();
  var rows = c.side.filter(function (id) { return c.tabs.indexOf(id) < 0; }).map(function (id) {
    return '<button class="mrow" data-go="' + id + '"><svg class="ic"><use href="#' + ITEMS[id][1] + '"/></svg><span class="grow">' + ITEMS[id][0] + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  }).join('');
  rows += '<button class="mrow" data-login><svg class="ic"><use href="#i-person"/></svg><span class="grow">' + (SERVER.on ? 'Профиль и выход' : 'Войти под другой ролью') + '</span><svg class="ic"><use href="#i-chevron-right"/></svg></button>';
  return '<section class="scr"><div class="t-h1">Ещё</div><div>' + rows + '</div></section>';
}

