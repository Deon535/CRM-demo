-- ▪ Миграция 0003 «товар»: категории, модели, варианты (размеры), остатки по магазинам, закупочные партии, брони.
-- Решения (ТЗ 3): товар = модель + варианты; остаток хранится «на полке» по каждому варианту и магазину;
-- «доступно» = на полке минус действующая бронь (считает сервер); закупочная цена живёт в партии, а не в модели.
-- Деньги в копейках. Ничего не удаляем: модель можно только выключить (is_active = 0).

CREATE TABLE categories (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
) STRICT;

-- Модель товара («Рубашка Oxford»). color: цвет или материал, как на ярлыке (в демо у носков это «хлопок»).
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  article     TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories (id),
  color       TEXT NOT NULL DEFAULT '',
  price_kopecks INTEGER NOT NULL CHECK (price_kopecks >= 0),
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
CREATE INDEX products_category ON products (category_id);

-- Вариант = размер модели. sort_order задаёт порядок (S, M, L, XL), его же использует экран.
CREATE TABLE variants (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id),
  size       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, size)
) STRICT;

-- Остаток «на полке»: сколько штук варианта лежит в магазине (или на складе). Нет строки = ноль.
CREATE TABLE stock (
  variant_id INTEGER NOT NULL REFERENCES variants (id),
  shop_id    INTEGER NOT NULL REFERENCES shops (id),
  qty        INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (variant_id, shop_id)
) STRICT;
CREATE INDEX stock_shop ON stock (shop_id);

-- Закупочные партии. Цена закупки модели в карточке = цена последней партии. Количество, поставщик и долг добавим на шаге с закупками.
CREATE TABLE batches (
  id            INTEGER PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products (id),
  cost_kopecks  INTEGER NOT NULL CHECK (cost_kopecks >= 0),
  received_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
CREATE INDEX batches_product ON batches (product_id, received_at);

-- Брони (ТЗ 4): вещь отложена для клиента до срока. Пока действует, она вычитается из «доступно».
-- Оформлять и снимать брони научим на шаге 3.7; сейчас таблица нужна, чтобы карточка показывала «в брони».
CREATE TABLE holds (
  id         INTEGER PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants (id),
  shop_id    INTEGER NOT NULL REFERENCES shops (id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  expires_at TEXT NOT NULL,
  staff_id   INTEGER REFERENCES staff (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
CREATE INDEX holds_variant ON holds (variant_id, shop_id);
