-- ▪ Миграция 0002 «вход и роли»: роли, права, сотрудники, пропуска (сессии), журнал действий.
-- Решения (ноябрь 2026): права лежат в базе, роль = набор прав; у сотрудника записана только роль;
-- пропуск хранится таблицей на сервере (в базе только отпечаток номера); ПИН хранится хэшем.

-- Роли. Шесть готовых (is_system = 1), владелец может создавать свои.
CREATE TABLE roles (
  id         INTEGER PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL UNIQUE,
  is_system  INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO roles (code, name, is_system) VALUES
  ('owner',          'Владелец',         1),
  ('senior_seller',  'Старший продавец', 1),
  ('seller',         'Продавец',         1),
  ('online_manager', 'Онлайн-менеджер',  1),
  ('courier',        'Курьер',           1),
  ('accountant',     'Бухгалтер',        1);

-- Закрытый список прав: новые права придумываем мы (в коде), владелец только раздаёт существующие.
-- На экране «Права ролей» строка «Прибыль и отчёты» здесь разделена на два права: reports и profit.
CREATE TABLE permissions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;

INSERT INTO permissions (code, name) VALUES
  ('stock',    'Остатки по всем магазинам'),
  ('cost',     'Закупочные цены'),
  ('sale',     'Продажа'),
  ('return',   'Возврат'),
  ('transfer', 'Перемещения'),
  ('cash',     'Касса и смены'),
  ('orders',   'Заказы'),
  ('clients',  'Клиенты'),
  ('expenses', 'Расходы'),
  ('reports',  'Отчёты'),
  ('profit',   'Прибыль'),
  ('staff',    'Сотрудники и зарплата'),
  ('settings', 'Настройки');

-- Какая роль какие права имеет.
--   scope: область данных: all = все магазины, shop = только свой магазин, own = только свои записи.
--   mode:  full = смотреть и менять, view = только смотреть.
--   limit_kopecks: предел суммы в копейках (например, сколько продавец может вернуть сам, без подтверждения старшим).
CREATE TABLE role_permissions (
  role_id         INTEGER NOT NULL REFERENCES roles (id),
  permission_code TEXT NOT NULL REFERENCES permissions (code),
  scope           TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'shop', 'own')),
  mode            TEXT NOT NULL DEFAULT 'full' CHECK (mode IN ('full', 'view')),
  limit_kopecks   INTEGER CHECK (limit_kopecks IS NULL OR limit_kopecks >= 0),
  PRIMARY KEY (role_id, permission_code)
) STRICT;

-- Стандартные права ролей: то же, что нарисовано в демо (design-system, раздел 19) и записано в ТЗ раздел 2.
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'stock', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'senior_seller', 'seller', 'online_manager');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'cost', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'accountant');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'sale', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'senior_seller', 'seller');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'return', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'senior_seller');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'return', 'all', 'full', 300000 FROM roles WHERE code = 'seller';      -- сам до 3 000 ₽ (ТЗ 11, вопрос 22)
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'transfer', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'senior_seller');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'cash', 'all', 'full', NULL FROM roles WHERE code = 'owner';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'cash', 'shop', 'full', NULL FROM roles WHERE code = 'senior_seller';  -- свой магазин
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'cash', 'own', 'full', NULL FROM roles WHERE code = 'seller';          -- своя смена
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'orders', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'online_manager');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'orders', 'all', 'view', NULL FROM roles WHERE code IN ('senior_seller', 'seller');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'orders', 'own', 'full', NULL FROM roles WHERE code = 'courier';       -- только свои заказы
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'clients', 'all', 'full', NULL FROM roles WHERE code IN ('owner', 'senior_seller', 'seller', 'online_manager');
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'expenses', 'all', 'full', NULL FROM roles WHERE code = 'owner';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'expenses', 'all', 'view', NULL FROM roles WHERE code = 'accountant';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'reports', 'all', 'full', NULL FROM roles WHERE code = 'owner';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'reports', 'all', 'view', NULL FROM roles WHERE code = 'accountant';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'profit', 'all', 'full', NULL FROM roles WHERE code = 'owner';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'staff', 'all', 'full', NULL FROM roles WHERE code = 'owner';
INSERT INTO role_permissions (role_id, permission_code, scope, mode, limit_kopecks)
  SELECT id, 'settings', 'all', 'full', NULL FROM roles WHERE code = 'owner';

-- Сотрудники. Не удаляем (ТЗ 10.7): при увольнении is_active = 0, а продажи и журнал остаются с его именем.
--   login: имя для входа, регистр не важен. pin_hash: ПИН только в виде необратимого отпечатка (хэша).
--   shop_id: магазин сотрудника, NULL = все магазины. must_change_pin = 1: при первом входе надо сменить ПИН.
--   failed_attempts / locked_until: счётчик неверных ПИН и время, до которого вход заблокирован (UTC).
CREATE TABLE staff (
  id              INTEGER PRIMARY KEY,
  login           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  role_id         INTEGER NOT NULL REFERENCES roles (id),
  shop_id         INTEGER REFERENCES shops (id),
  pin_hash        TEXT NOT NULL,
  must_change_pin INTEGER NOT NULL DEFAULT 1 CHECK (must_change_pin IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Пропуска (сессии). В базе только отпечаток номера (token_hash): сам номер лежит у человека в cookie.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  staff_id   INTEGER NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
) STRICT;
CREATE INDEX sessions_staff_id ON sessions (staff_id);

-- Журнал действий (ТЗ 8.9). Пока пишет входы, блокировки, создание и увольнение сотрудников; остальное добавим вместе с разделами.
CREATE TABLE audit_log (
  id       INTEGER PRIMARY KEY,
  at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  staff_id INTEGER REFERENCES staff (id),
  action   TEXT NOT NULL,
  subject  TEXT,
  details  TEXT
) STRICT;
CREATE INDEX audit_log_at ON audit_log (at);
