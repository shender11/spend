const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const SYNC_FROM = "2022-01-01";
const SYNC_CHUNK_DAYS = 7;

let syncRunning = false;

setTimeout(syncSpend, 2000);
setInterval(syncSpend, SYNC_INTERVAL_MS);

async function syncSpend() {
  if (syncRunning) return;
  syncRunning = true;

  try {
    const items = await collectOrbitaMenStatisticsChunked(SYNC_FROM, today(), sendPartialSync);
    await sendPartialSync(items, { final: true });
    console.log("[Orbita Spend Sync] synced", items.length);
  } catch (error) {
    console.warn("[Orbita Spend Sync] failed", error);
  } finally {
    syncRunning = false;
  }
}

async function collectOrbitaMenStatisticsChunked(dateFrom, dateTo, onProgress = null) {
  const totals = new Map();
  const ranges = buildDateRanges(dateFrom, dateTo, SYNC_CHUNK_DAYS);

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const items = await collectOrbitaMenStatistics(range.from, range.to);
    for (const item of items) {
      const previous = totals.get(item.clientId) || {
        clientId: item.clientId,
        name: item.name || "",
        total: 0
      };
      previous.name ||= item.name || "";
      previous.total = money(previous.total + item.total);
      totals.set(item.clientId, previous);
    }

    if (typeof onProgress === "function" && items.length) {
      await onProgress([...totals.values()], {
        final: false,
        range,
        index: index + 1,
        totalRanges: ranges.length
      });
    }
  }

  return [...totals.values()];
}

async function sendPartialSync(items, progress = {}) {
  await sendToBot({
    type: "ORBITA_SPEND_SYNC",
    url: location.href,
    time: new Date().toISOString(),
    progress,
    items
  });
  console.log("[Orbita Spend Sync] progress", {
    clients: items.length,
    range: progress.range,
    index: progress.index,
    totalRanges: progress.totalRanges,
    final: Boolean(progress.final)
  });
}

async function collectOrbitaMenStatistics(dateFrom, dateTo) {
  const items = await orbitaPostJson("/statistics/types/men", {
    whereGte: { date: dateFrom },
    whereLte: { date: dateTo },
    whereIn: {
      "st-profile_external_id": "",
      category_id: [],
      "s_admin-id": [],
      "st-operator_id": []
    },
    where: { "w-man_profile": "" }
  });

  return (items || []).map((item) => ({
    clientId: String(item.male_id || ""),
    name: String(item.male || ""),
    total: money(item.total)
  })).filter((item) => item.clientId);
}

async function orbitaPostJson(path, payload) {
  if (window.$?.ajax) {
    return new Promise((resolve, reject) => {
      window.$.ajax(path, {
        data: payload,
        method: "POST",
        success: resolve,
        error: (xhr) => reject(new Error(`${path} failed ${xhr?.status || ""}: ${xhr?.responseText || ""}`))
      });
    });
  }

  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams(flattenPayload(payload))
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} failed ${response.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  return json.response ?? json;
}

async function sendToBot(payload) {
  const response = await chrome.runtime.sendMessage({
    type: "SEND_ORBITA_SPEND",
    payload
  });
  if (!response?.ok) {
    throw new Error(response?.error || "bot sync failed");
  }
  return response.result;
}

function flattenPayload(payload, prefix = "") {
  const output = {};
  for (const [key, value] of Object.entries(payload || {})) {
    const field = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        output[`${field}[${index}]`] = item;
      });
    } else if (value && typeof value === "object") {
      Object.assign(output, flattenPayload(value, field));
    } else {
      output[field] = value ?? "";
    }
  }
  return output;
}

function today() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDateRanges(from, to, chunkDays) {
  const ranges = [];
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) return ranges;

  let cursor = start;
  while (cursor <= end) {
    const rangeStart = new Date(cursor);
    const rangeEnd = new Date(cursor);
    rangeEnd.setDate(rangeEnd.getDate() + Math.max(1, chunkDays) - 1);
    if (rangeEnd > end) rangeEnd.setTime(end.getTime());

    ranges.push({
      from: formatDate(rangeStart),
      to: formatDate(rangeEnd)
    });

    cursor = new Date(rangeEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return ranges;
}

function parseDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(value) {
  const parsed = Number.parseFloat(String(value || "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}
