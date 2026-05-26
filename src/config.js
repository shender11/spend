export const config = {
  port: intEnv("PORT", 3001),
  publicUrl: process.env.PUBLIC_URL || "",
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || ""
  },
  extension: {
    token: process.env.EXTENSION_TOKEN || ""
  },
  dataDir: process.env.DATA_DIR || "data",
  archiveCsvPath: process.env.ARCHIVE_CSV_PATH || "data/archive-spend.csv",
  archiveCsvUrl: process.env.ARCHIVE_CSV_URL || "",
  allowedChatIds: new Set(
    String(process.env.ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),
  orbita: {
    syncFrom: process.env.ORBITA_SYNC_FROM || "2022-01-01"
  }
};

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) ? value : fallback;
}
