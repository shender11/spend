import { config } from "../src/config.js";

if (!config.telegram.token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}
if (!config.publicUrl) {
  throw new Error("PUBLIC_URL is required");
}

const webhookUrl = `${config.publicUrl.replace(/\/$/, "")}/telegram/webhook`;
const response = await fetch(`https://api.telegram.org/bot${config.telegram.token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: config.telegram.webhookSecret || undefined
  })
});

const text = await response.text();
if (!response.ok) {
  throw new Error(`setWebhook failed ${response.status}: ${text}`);
}

console.log(text);
