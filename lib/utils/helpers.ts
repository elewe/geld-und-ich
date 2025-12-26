// INDEX: lib/utils/helpers.ts
// Beispiel-Hilfsfunktionen
// Füge hier deine Utility-Funktionen hinzu

/**
 * Formatiert einen Betrag als Währung
 */
export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Formatiert ein Datum
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateObj);
}

