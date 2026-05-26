import { readFile } from "node:fs/promises";
import { money } from "./money.js";

export async function loadArchiveCsv(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseArchiveCsv(raw);
  } catch {
    return { clients: {}, rows: 0 };
  }
}

function parseArchiveCsv(raw) {
  const rows = parseCsv(raw, detectDelimiter(raw));
  if (!rows.length) return { clients: {}, rows: 0 };

  const headers = rows[0].map((header) => normalizeHeader(header));
  const clientIndex = firstIndex(headers, ["client_id", "male_id", "client", "id", "man_id"]);
  const spendIndex = firstIndex(headers, ["spend", "total", "amount", "sum", "balance"]);
  if (clientIndex < 0 || spendIndex < 0) return { clients: {}, rows: 0 };

  const clients = {};
  let count = 0;
  for (const row of rows.slice(1)) {
    const clientId = onlyDigits(row[clientIndex]);
    if (!clientId) continue;

    clients[clientId] ??= 0;
    clients[clientId] = money(clients[clientId] + money(row[spendIndex]));
    count += 1;
  }

  return { clients, rows: count };
}

function parseCsv(raw, delimiter = ",") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

function detectDelimiter(raw) {
  const firstLine = String(raw || "").split(/\r?\n/, 1)[0] || "";
  return firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function firstIndex(headers, names) {
  return names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}
