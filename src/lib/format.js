export const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const toDate = (v) => {
  if (!v) return new Date(0);
  if (typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  return new Date(v);
};

export const timeStr = (v) =>
  toDate(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const dateStr = (v) =>
  toDate(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const dateTimeStr = (v) => `${dateStr(v)} · ${timeStr(v)}`;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Chave de mês "AAAA-MM" a partir de Timestamp/Date/number.
export const monthKey = (v) => {
  const d = toDate(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
// Chave de mês a partir de uma data ISO "AAAA-MM-DD" (string).
export const monthKeyISO = (iso) => (iso || "").slice(0, 7);

export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
