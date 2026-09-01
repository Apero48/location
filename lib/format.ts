export function fcfa(n: number): string {
  return new Intl.NumberFormat("fr-BJ", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}
