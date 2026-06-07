export function getDateRangeParams(period: "todo" | "hoy" | "semana" | "mes"): { from?: string; to?: string } {
  if (period === "todo") return {};
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);
  if (period === "hoy") return { from: toDate, to: toDate };
  if (period === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: start.toISOString().slice(0, 10), to: toDate };
  }
  if (period === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString().slice(0, 10), to: toDate };
  }
  return {};
}
