#!/usr/bin/env bash
# ▪ Файл сервер/scripts/deploy.sh: обновление сервера «одной командой». Запуск на сервере: npm run deploy
# Порядок: копия базы -> свежий код с GitHub -> детали (npm ci) -> тесты -> перезапуск сторожа (systemd) -> проверка, что CRM отвечает.
# Любой шаг упал: скрипт останавливается и дальше не идёт (set -e), поэтому сломанный код не перезапускается.
# Имя службы по умолчанию crm, адрес проверки http://127.0.0.1:3000/api/health; меняются переменными SERVICE и HEALTH_URL.
set -euo pipefail

SERVICE="${SERVICE:-crm}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"

cd "$(dirname "$0")/.."   # в папку сервер/, откуда бы ни запустили

echo "== 1/6 Копия базы (на случай, если обновление что-то сломает)"
node scripts/backup.js

echo "== 2/6 Свежий код с GitHub (только «прямое» обновление, без слияний)"
before="$(git rev-parse --short HEAD)"
git pull --ff-only
after="$(git rev-parse --short HEAD)"

echo "== 3/6 Детали программы (npm ci: ровно версии из package-lock.json)"
npm ci --omit=dev

echo "== 4/6 Автоматические проверки"
npm test --silent

echo "== 5/6 Перезапуск сторожа (спросит пароль sudo)"
sudo systemctl restart "$SERVICE"

echo "== 6/6 Проверка, что CRM отвечает"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if answer="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)"; then
    echo "$answer"
    if [ "$before" = "$after" ]; then
      echo "ГОТОВО. Код не изменился ($after), служба перезапущена."
    else
      echo "ГОТОВО. Было $before, стало $after."
    fi
    exit 0
  fi
  sleep 1
done

echo "ОШИБКА: CRM не отвечает после перезапуска. Что смотреть:"
echo "  journalctl -u $SERVICE -n 30 --no-pager      (журнал службы)"
echo "  Вернуться на прошлую версию кода: git checkout $before   затем: sudo systemctl restart $SERVICE"
echo "  Копии базы лежат в папке backups/ (прошлая версия базы)."
exit 1
