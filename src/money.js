export function money(value) {
  if (typeof value === "number") return roundMoney(value);
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(parsed);
}

export function formatMoney(value) {
  return money(value).toFixed(2);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
