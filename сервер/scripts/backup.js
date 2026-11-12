// ▪ Файл сервер/scripts/backup.js: резервная копия базы. Запуск: npm run db:backup (на сервере его вызывает cron раз в сутки).
// Копия делается встроенной командой SQLite (backup): безопасно, даже когда CRM в этот момент пишет в базу.
// Сначала пишем во временный файл .part, проверяем целостность и только потом переименовываем: неполная копия не выглядит готовой.
// Настройки (необязательно): BACKUP_DIR (куда класть, по умолчанию сервер/backups/), BACKUP_KEEP_DAYS (сколько дней хранить, по умолчанию 14).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { DB_FILE } from '../src/db/db.js';

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(import.meta.dirname, '..', 'backups');
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS) || 14;
const NAME_RE = /^crm-\d{4}-\d{2}-\d{2}-\d{6}\.db$/;

function fail(text) {
  console.error(`ОШИБКА: ${text}`);
  process.exit(1);
}

if (!fs.existsSync(DB_FILE)) fail(`файла базы нет: ${DB_FILE}`);
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/\.\d+Z$/, '').replace(/[-:]/g, '').replace('T', '-');  // 20261112-123456 (UTC)
const name = `crm-${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}-${stamp.slice(9)}.db`;
const finalPath = path.join(BACKUP_DIR, name);
const partPath = `${finalPath}.part`;

// 1. Делаем копию
const source = new DatabaseSync(DB_FILE);
source.exec('PRAGMA busy_timeout = 5000');
try {
  await backup(source, partPath);
} catch (err) {
  fs.rmSync(partPath, { force: true });
  fail(`копия не сделана: ${err.message}`);
} finally {
  source.close();
}

// 2. Проверяем копию: открывается, целая, миграции на месте
let version;
try {
  // Открываем обычным способом (не «только чтение»), чтобы SQLite сам убрал за собой служебные файлы -wal и -shm.
  // journal_mode = DELETE делает копию одним самодостаточным файлом.
  const copy = new DatabaseSync(partPath);
  copy.exec('PRAGMA journal_mode = DELETE');
  const integrity = copy.prepare('PRAGMA integrity_check').get().integrity_check;
  if (integrity !== 'ok') throw new Error(`проверка целостности: ${integrity}`);
  version = copy.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get()?.version;
  copy.close();
  if (!version) throw new Error('в копии нет записей о миграциях');
} catch (err) {
  fs.rmSync(partPath, { force: true });
  fail(`копия не прошла проверку и удалена: ${err.message}`);
}

fs.renameSync(partPath, finalPath);
const kb = Math.round(fs.statSync(finalPath).size / 1024);
console.log(`Копия готова: ${finalPath} (${kb} КБ, версия базы ${version}, проверка целостности: ok)`);

// 3. Удаляем старые копии (только файлы с нашими именами)
const limit = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
let removed = 0;
for (const f of fs.readdirSync(BACKUP_DIR)) {
  const p = path.join(BACKUP_DIR, f);
  if (NAME_RE.test(f) && fs.statSync(p).mtimeMs < limit) {
    fs.rmSync(p);
    removed++;
  }
}
if (removed) console.log(`Удалено старых копий (старше ${KEEP_DAYS} дн.): ${removed}`);
