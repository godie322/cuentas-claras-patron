export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function getYearRange(startYear = 2024): number[] {
  const current = currentYear();
  const years: number[] = [];
  for (let y = current; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}
