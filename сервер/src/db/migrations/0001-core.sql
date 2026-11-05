-- ▪ Миграция 0001 «основа»: торговые точки, правила, модули. Структура и стандартные значения по умолчанию (демо-данных здесь нет).
-- Правила миграций:
--   1) применённый файл не правим, только добавляем новые;
--   2) внутри не пишем BEGIN и COMMIT, их ставит запускатель (src/db/db.js);
--   3) деньги храним в копейках целым числом (3 590 ₽ это 359000);
--   4) время храним строкой в мировом времени (UTC): 2026-11-05T12:00:00.000Z.

-- Торговые точки: магазины, склады, интернет-магазин (ТЗ 10.3, 12.4). Не удаляем, а выключаем (is_active = 0).
CREATE TABLE shops (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL CHECK (kind IN ('shop', 'warehouse', 'online')),  -- магазин, склад, интернет-магазин
  plan_kopecks INTEGER CHECK (plan_kopecks IS NULL OR plan_kopecks >= 0),       -- план продаж на месяц (ТЗ 8.7); у склада его нет
  is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Правила (ТЗ 11, 12.1). Стандартные значения: решения Магомеда, каждый магазин ставит свои.
-- Проценты и дни целым числом; деньги в копейках (в ключе слово kopecks).
CREATE TABLE rules (
  key        TEXT PRIMARY KEY,
  value      INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO rules (key, value) VALUES
  ('disc_seller_pct',      5),        -- скидка продавца, до, %
  ('disc_senior_pct',      10),       -- скидка старшего продавца, до, %
  ('return_days',          14),       -- срок возврата, дней
  ('return_defect_days',   30),       -- срок возврата брака, дней
  ('hold_days',            3),        -- срок брони, дней
  ('seller_pct',           2),        -- процент продавцу с личных продаж, %
  ('plan_bonus_kopecks',   500000),   -- бонус за выполненный план: 5 000 ₽
  ('prepay_from_kopecks',  1000000);  -- предоплата обязательна от суммы: 10 000 ₽

-- Модули (ТЗ 12.3): включены (1) или выключены (0). Стандартный набор из демо: 9 включены, 8 выключены.
CREATE TABLE modules (
  code       TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO modules (code, enabled) VALUES
  ('delivery',         1),  -- доставка и курьеры
  ('chats',            1),  -- переписки
  ('mailings',         1),  -- рассылки клиентам
  ('hold',             1),  -- бронь
  ('promos',           1),  -- акции и переоценка
  ('analytics',        1),  -- аналитика
  ('labels',           1),  -- печать этикеток и штрихкодов
  ('excel',            1),  -- импорт и экспорт Excel
  ('notifications',    1),  -- уведомления
  ('installments',     0),  -- рассрочка и долги клиентов
  ('loyalty',          0),  -- накопительная скидка
  ('gift_cards',       0),  -- подарочные сертификаты
  ('supplier_returns', 0),  -- возврат поставщику
  ('consignment',      0),  -- товар на реализации
  ('services',         0),  -- услуги (подгонка, ремонт)
  ('forecast',         0),  -- прогноз закупки
  ('currencies',       0);  -- несколько валют
