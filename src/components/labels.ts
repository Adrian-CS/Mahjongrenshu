export function shantenLabel(shanten: number): string {
  if (shanten === -1) return "agari";
  if (shanten === 0) return "tenpai";
  return `${shanten}-shanten`;
}
