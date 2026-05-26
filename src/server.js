import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { SpendStore } from "./spendStore.js";
import { TelegramBot } from "./telegram.js";

const store = new SpendStore();
await store.load();
const bot = new TelegramBot(store);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, {
        ok: true,
        orbitaClients: store.data.orbita.count || 0,
        archiveRows: store.archive.rows || 0,
        lastOrbitaSyncAt: store.data.orbita.lastSyncAt || ""
      });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      if (config.telegram.webhookSecret && request.headers["x-telegram-bot-api-secret-token"] !== config.telegram.webhookSecret) {
        return json(response, 403, { ok: false });
      }
      await bot.handleUpdate(await readJson(request));
      return json(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/extension/orbita-sync") {
      if (config.extension.token && request.headers["x-extension-token"] !== config.extension.token) {
        return json(response, 403, { ok: false });
      }
      const payload = await readJson(request);
      const items = Array.isArray(payload.items) ? payload.items : [];
      store.upsertOrbitaItems(items, payload.time || new Date().toISOString());
      await store.save();
      logger.info(`Orbita spend synced: clients=${store.data.orbita.count}`);
      return json(response, 200, { ok: true, clients: store.data.orbita.count });
    }

    return json(response, 404, { ok: false, error: "not_found" });
  } catch (error) {
    logger.error(error);
    return json(response, 500, { ok: false, error: error.message });
  }
});

server.listen(config.port, () => {
  logger.info(`Spend bot listening on ${config.port}`);
});

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
