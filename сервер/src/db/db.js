// ▪ Файл сервер/src/db/db.js: подключение к базе SQLite и запуск миграций (пронумерованных файлов в папке migrations/).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SERVER_DIR = path.join(import.meta.dirname, '..', '..');
export const DB_FILE = process.env.DB_FILE || path.join(SERVER_DIR, 'data', 'crm.db');
const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

// Открывает файл базы (создаёт, если его нет) и включает нужные режимы
export function openDb(file = DB_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');   // запись не мешает чтению
  db.exec('PRAGMA foreign_keys = ON');    // база следит, чтобы ссылки между таблицами не вели в пустоту
  db.exec('PRAGMA busy_timeout = 5000');  // если база занята, подождать до 5 секунд
  return db;
}

// Применяет новые миграции по порядку. Каждая выполняется целиком или не выполняется вовсе. Возвращает список применённых.
export function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ) STRICT`);
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (done.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Миграция ${version} не применилась: ${err.message}`);
    }
    applied.push(version);
  }
  return applied;
}

// Номер последней применённой миграции (например, «0001-core»)
export function schemaVersion(db) {
  const row = db.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get();
  return row ? row.version : null;
}
