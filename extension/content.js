const SPEND_BOT_ENDPOINT = "https://your-service.onrender.com/extension/orbita-sync";
const EXTENSION_TOKEN = "change-me";
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const SYNC_FROM = "2022-01-01";

let syncRunning = false;

setTimeout(syncSpend, 2000);
setInterval(syncSpend, SYNC_INTERVAL_MS);

async function syncSpend() {
  if (syncRunning) return;
  syncRunning = true;

  try {
    const items = await collectOrbitaMenStatistics(SYNC_FROM, today());
    await sendToBot({
      type: "ORBITA_SPEND_SYNC",
      url: location.href,
      time: new Date().toISOString(),
      items
    });
    console.log("[Orbita Spend Sync] synced", items.length);
  } catch (error) {
    console.warn("[Orbita Spend Sync] failed", error);
  } finally {
    syncRunning = false;
  }
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
  const response = await fetch(SPEND_BOT_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-extension-token": EXTENSION_TOKEN
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`bot sync failed ${response.status}: ${await response.text()}`);
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

function money(value) {
  const parsed = Number.parseFloat(String(value || "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}
