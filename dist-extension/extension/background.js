const SPEND_BOT_ENDPOINT = "https://spend-tc53.onrender.com/extension/orbita-sync";
const EXTENSION_TOKEN = "spend-sync-123";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SEND_ORBITA_SPEND") return false;

  sendToBot(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

async function sendToBot(payload) {
  const response = await fetch(SPEND_BOT_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-extension-token": EXTENSION_TOKEN
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`bot sync failed ${response.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}
