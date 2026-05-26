# Orbita Spend Bot

Отдельный бот для проверки lifetime spend клиента.

Формат ответа:

```text
123456789 — $842.50
```

## Как работает

1. Owner открывает Orbita в Chrome с расширением из `extension/`.
2. Расширение отправляет spend клиентов на сервер.
3. Сервер хранит кеш в `DATA_DIR`.
4. Переводчик пишет ID клиента в Telegram-бот.
5. Бот отвечает суммой `Orbita cache + archive CSV`.

Если Orbita разлогинилась, кеш остается и бот отвечает последней известной суммой.

## Archive CSV

Файл: `ARCHIVE_CSV_PATH`, по умолчанию `/var/data/archive-spend.csv`.
Можно также подключить Google Sheets через `ARCHIVE_CSV_URL`.

Минимальные колонки:

```csv
client_id,spend
123456789,100.50
123456789,20
```

Можно использовать `male_id`, `client`, `id` вместо `client_id`; `total`, `amount`, `sum` вместо `spend`.

## Render env

```text
PUBLIC_URL=https://your-service.onrender.com
TELEGRAM_BOT_TOKEN=...
EXTENSION_TOKEN=...
DATA_DIR=/var/data
ARCHIVE_CSV_PATH=/var/data/archive-spend.csv
ALLOWED_CHAT_IDS=
ORBITA_SYNC_FROM=2022-01-01
```

`ALLOWED_CHAT_IDS` можно оставить пустым, тогда бот отвечает всем. Можно задать через запятую.

## Google Sheets

1. В Google Sheets нажать `Share`.
2. Поставить доступ `Anyone with the link` -> `Viewer`.
3. В Render добавить переменную `ARCHIVE_CSV_URL` вида:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
```

Для таблицы:

```text
https://docs.google.com/spreadsheets/d/1pUP8HwQbDm-03fZVMFQVYC4M31PSCUE2dR8H1FBgPQs/export?format=csv&gid=0
```
