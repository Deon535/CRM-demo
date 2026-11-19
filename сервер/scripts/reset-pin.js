// ▪ Файл сервер/scripts/reset-pin.js: «забыл ПИН»: выдать сотруднику новый временный ПИН.
// Запуск на сервере: npm run pin:reset -- логин   (пример: npm run pin:reset -- magomed)
// Печатает временный ПИН один раз, при входе его надо сменить. Старые пропуска сотрудника перестают действовать.
import { openDb, migrate, DB_FILE } from '../src/db/db.js';
import { resetPin } from '../src/auth/auth.js';

const [loginName] = process.argv.slice(2);
if (!loginName) {
  console.log('Использование: npm run pin:reset -- логин');
  process.exit(1);
}

const db = openDb();
migrate(db);
const res = resetPin(db, loginName);
db.close();

const errors = {
  not_found: 'Такого логина в этой базе нет. Проверьте написание (регистр не важен).',
  inactive: 'Этот сотрудник «уволен», вход ему закрыт.',
};
if (!res.ok) {
  console.log(`ПИН не сброшен. ${errors[res.code] ?? res.code}`);
  process.exit(1);
}
console.log(`ПИН сброшен. База: ${DB_FILE}`);
console.log(`Логин: ${res.login}`);
console.log(`Временный ПИН: ${res.tempPin}   (запишите сейчас, больше он не показывается; при входе система попросит придумать свой)`);
