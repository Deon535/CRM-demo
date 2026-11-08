// ▪ Файл сервер/scripts/create-owner.js: «создать первого владельца» при установке на новый сервер.
// Запуск: npm run owner:create -- логин "Имя Фамилия"   (пример: npm run owner:create -- magomed "Магомед Курбанов")
// Печатает временный ПИН один раз: запишите его, при первом входе система попросит сменить.
import { openDb, migrate, DB_FILE } from '../src/db/db.js';
import { createFirstOwner } from '../src/auth/auth.js';

const [loginName, fullName] = process.argv.slice(2);
if (!loginName || !fullName) {
  console.log('Использование: npm run owner:create -- логин "Имя Фамилия"');
  process.exit(1);
}

const db = openDb();
migrate(db);   // на совсем новом сервере базы ещё нет: создаём её и таблицы
const res = createFirstOwner(db, { login: loginName, fullName });
db.close();

const errors = {
  bad_login: 'Логин: 3–32 символа, латинские буквы, цифры, точка, дефис, подчёркивание.',
  bad_name: 'Укажите имя в кавычках, например "Магомед Курбанов".',
  owner_exists: 'Владелец в этой базе уже есть, второго этой командой не создать. Новых сотрудников добавляет владелец в самой системе.',
  no_roles: 'В базе нет ролей: не применились миграции.',
};
if (!res.ok) {
  console.log(`Не создано. ${errors[res.code] ?? res.code}`);
  process.exit(1);
}
console.log(`Владелец создан. База: ${DB_FILE}`);
console.log(`Логин: ${res.login}`);
console.log(`Временный ПИН: ${res.tempPin}   (запишите сейчас, больше он не показывается; при первом входе смените)`);
