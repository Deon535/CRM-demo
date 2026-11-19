-- ▪ Миграция 0004 «продажа»: чеки и их строки.
-- Решения (ТЗ 6): продажа это одна неделимая операция (чек, строки, списание остатка) «всё или ничего»;
-- у каждого чека свой уникальный номер uid, придуманный на экране: повторная отправка того же чека не создаёт второй (пригодится для офлайна).
-- Деньги в копейках. Ничего не удаляем: исправляют возвратом (шаг 3.7).

-- Шапка чека. id это номер чека, который видит продавец.
--   uid: уникальный номер от экрана (защита от дублей).
--   client_id: клиент (число без ссылки: таблица клиентов появится в шаге 3.7, тогда свяжем).
--   payment: cash = наличные, card = карта, transfer = перевод.
--   subtotal_kopecks: сумма до скидки; discount_pct: скидка на весь чек, %; discount_kopecks: она же в копейках; total_kopecks: итог.
CREATE TABLE sales (
  id               INTEGER PRIMARY KEY,
  uid              TEXT NOT NULL UNIQUE,
  shop_id          INTEGER NOT NULL REFERENCES shops (id),
  staff_id         INTEGER NOT NULL REFERENCES staff (id),
  client_id        INTEGER,
  payment          TEXT NOT NULL CHECK (payment IN ('cash', 'card', 'transfer')),
  subtotal_kopecks INTEGER NOT NULL CHECK (subtotal_kopecks >= 0),
  discount_pct     INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  discount_kopecks INTEGER NOT NULL DEFAULT 0 CHECK (discount_kopecks >= 0),
  total_kopecks    INTEGER NOT NULL CHECK (total_kopecks >= 0),
  sold_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
CREATE INDEX sales_shop_time ON sales (shop_id, sold_at);
CREATE INDEX sales_staff_time ON sales (staff_id, sold_at);

-- Строки чека. Цена и закупка записаны «снимком» на момент продажи: потом цена модели может измениться, а чек останется прежним.
--   paid_kopecks: сколько клиент заплатил за эту строку после скидки (от неё считаем возврат и выручку).
CREATE TABLE sale_items (
  id             INTEGER PRIMARY KEY,
  sale_id        INTEGER NOT NULL REFERENCES sales (id),
  variant_id     INTEGER NOT NULL REFERENCES variants (id),
  qty            INTEGER NOT NULL CHECK (qty > 0),
  price_kopecks  INTEGER NOT NULL CHECK (price_kopecks >= 0),
  cost_kopecks   INTEGER NOT NULL DEFAULT 0 CHECK (cost_kopecks >= 0),
  paid_kopecks   INTEGER NOT NULL CHECK (paid_kopecks >= 0)
) STRICT;
CREATE INDEX sale_items_sale ON sale_items (sale_id);
CREATE INDEX sale_items_variant ON sale_items (variant_id);
