import type { Shape } from "@/lib/mahjong";

export const SHAPE_LABELS: Record<Shape, string> = {
  "isolated-honor": "Honor aislado",
  "isolated-terminal": "Terminal aislado (1/9)",
  "isolated-simple": "Tile aislado (2–8)",
  kanchan: "Kanchan",
  penchan: "Penchan",
  ryanmen: "Ryanmen",
  pair: "Pareja",
  triplet: "Trío",
  sequence: "Secuencia",
};
