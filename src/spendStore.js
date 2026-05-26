import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { loadArchiveCsv } from "./archiveCsv.js";
import { money } from "./money.js";

export class SpendStore {
  constructor(filePath = join(config.dataDir, "spend-cache.json")) {
    this.filePath = filePath;
    this.data = defaultState();
    this.archive = { clients: {}, rows: 0 };
  }

  async load() {
    try {
      this.data = mergeState(JSON.parse(await readFile(this.filePath, "utf8")));
    } catch {
      this.data = defaultState();
      await this.save();
    }
    await this.reloadArchive();
  }

  async save() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`);
  }

  async reloadArchive() {
    this.archive = await loadArchiveCsv(config.archiveCsvPath);
  }

  upsertOrbitaItems(items, syncedAt = new Date().toISOString()) {
    const clients = {};
    for (const item of items || []) {
      const clientId = normalizeClientId(item.clientId || item.male_id || item.maleId);
      if (!clientId) continue;
      clients[clientId] = {
        clientId,
        name: String(item.name || item.male || ""),
        total: money(item.total),
        syncedAt
      };
    }

    this.data.orbita.clients = clients;
    this.data.orbita.lastSyncAt = syncedAt;
    this.data.orbita.count = Object.keys(clients).length;
  }

  getTotal(clientId) {
    const id = normalizeClientId(clientId);
    if (!id) return null;

    const orbita = money(this.data.orbita.clients[id]?.total || 0);
    const archive = money(this.archive.clients[id] || 0);
    const total = money(orbita + archive);

    return {
      clientId: id,
      total,
      orbita,
      archive,
      found: Boolean(this.data.orbita.clients[id]) || Object.hasOwn(this.archive.clients, id),
      lastOrbitaSyncAt: this.data.orbita.lastSyncAt || ""
    };
  }
}

function defaultState() {
  return {
    orbita: {
      clients: {},
      count: 0,
      lastSyncAt: ""
    }
  };
}

function mergeState(value) {
  return {
    ...defaultState(),
    ...value,
    orbita: {
      ...defaultState().orbita,
      ...(value.orbita || {}),
      clients: value.orbita?.clients || {}
    }
  };
}

export function normalizeClientId(value) {
  return String(value || "").replace(/\D/g, "");
}
