import { config } from "./config.js";
import { formatMoney } from "./money.js";
import { normalizeClientId } from "./spendStore.js";

export class TelegramBot {
  constructor(store) {
    this.store = store;
  }

  async handleUpdate(update) {
    const message = update.message || update.edited_message;
    if (!message?.chat?.id) return;

    const chatId = String(message.chat.id);
    if (config.allowedChatIds.size && !config.allowedChatIds.has(chatId)) {
      await this.sendMessage(chatId, "Нет доступа.");
      return;
    }

    const text = String(message.text || "").trim();
    if (!text || text === "/start" || text === "/help") {
      await this.sendMessage(chatId, "Отправь ID клиента, я покажу spend.");
      return;
    }

    if (text === "/reload_archive") {
      await this.store.reloadArchive();
      await this.sendMessage(chatId, `Архивная таблица обновлена. Строк: ${this.store.archive.rows || 0}`);
      return;
    }

    const clientId = normalizeClientId(text);
    if (!clientId) {
      await this.sendMessage(chatId, "Отправь только ID клиента.");
      return;
    }

    const result = this.store.getTotal(clientId);
    await this.sendMessage(chatId, `${clientId} — $${formatMoney(result?.total || 0)}`);
  }

  async sendMessage(chatId, text) {
    const response = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram sendMessage failed ${response.status}: ${await response.text()}`);
    }
  }
}
