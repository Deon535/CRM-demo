// ▪ Файл сервер/scripts/db.js: команды для базы. `migrate` применяет новые миграции, `reset` удаляет базу и создаёт заново с демо-данными.
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { openDb, migrate, schemaVersion, DB_FILE } from '../src/db/db.js';
import { seedDemo } from '../src/db/seed-demo.js';

const command = process.argv[2];
const yes = process.argv.includes('--yes');

function showResult(db, applied) {
  console.log(applied.length ? `Применены миграции: ${applied.join(', ')}` : 'Новых миграций нет.');
  console.log(`Версия базы: ${schemaVersion(db)}`);
  console.log(`Файл базы: ${DB_FILE}`);
}

if (command === 'migrate') {
  const db = openDb();
  showResult(db, migrate(db));
  db.close();
} else if (command === 'reset') {
  if (!yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Это УДАЛИТ базу ${DB_FILE} и создаст заново с демо-данными. Напишите «да» для продолжения: `);
    rl.close();
    if (answer.trim().toLowerCase() !== 'да') {
      console.log('Отменено, ничего не удалено.');
      process.exit(0);
    }
  }
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_FILE + suffix, { force: true });
  const db = openDb();
  const applied = migrate(db);
  seedDemo(db);
  showResult(db, applied);
  console.log('Демо-данные загружены.');
  db.close();
} else {
  console.log('Команды: migrate (применить новые миграции), reset (пересоздать базу с демо-данными).');
  process.exit(1);
}
