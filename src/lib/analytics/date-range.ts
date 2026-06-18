export function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: formatIsoDate(from), to: formatIsoDate(to) };
}
