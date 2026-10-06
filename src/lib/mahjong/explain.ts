import { Block, BlockKind, readHand } from "./decomposition";
import { DiscardOption, HandEvaluation, findOption } from "./evaluator";
import { Problem } from "./generator";
import { problemTiles, representativeDiscard } from "./review";
import { Shape, classifyTile } from "./shapes";
import { chiitoitsuShanten, standardShanten } from "./shanten";
import { Tile, tileName, toCounts } from "./tiles";

/**
 * Automatic, structured explanation of a nanikiru answer: how the hand reads,
 * why the optimal discard wins, and the efficiency principle behind it.
 * Everything is derived from the engine, so it holds for any generated hand.
 */
export type HandForm = "standard" | "chiitoitsu" | "kokushi";

export interface Explanation {
  form: HandForm;
  /** Standard-form reading of the 13 tiles left after the optimal discard. */
  reading: Block[];
  optimal: DiscardOption;
  chosen: DiscardOption;
  correct: boolean;
  /** Accepted only after the optimal discard / only after the chosen one. */
  onlyOptimal: Tile[];
  onlyChosen: Tile[];
  /** Explanation paragraphs, most important first. */
  points: string[];
}

const SHANTEN_TEXT = (s: number) => (s === 0 ? "tenpai" : s === -1 ? "agari" : `${s}-shanten`);

const BLOCK_TEXT: Record<BlockKind, string> = {
  shuntsu: "una secuencia completa",
  koutsu: "un trío completo",
  toitsu: "una pareja",
  ryanmen: "un ryanmen (espera a dos lados)",
  penchan: "un penchan (espera de borde)",
  kanchan: "un kanchan (espera del medio)",
  floating: "un tile suelto",
};

const PRINCIPLE: Record<Shape, (tile: string) => string> = {
  "isolated-honor":
    () => "Un honor aislado solo mejora la mano si robas otra copia igual (como mucho 3 tiles). No puede formar secuencias, así que es el tile suelto menos flexible.",
  "isolated-terminal":
    () => "Un 1 o un 9 aislado solo conecta hacia un lado (el 1 con el 2 y el 3). Un tile central conecta hacia los dos, así que el terminal es el suelto menos útil después de los honores.",
  "isolated-simple":
    (t) => `El ${t} no forma parte de ningún bloque en la mejor lectura de la mano: no aporta nada a los grupos que ya tienes, así que es el candidato natural a salir.`,
  kanchan:
    () => "Un kanchan (p. ej. 4-6) espera un solo tipo de tile: 4 copias como mucho. Un ryanmen (4-5) espera dos tipos: hasta 8. Cuando sobra un bloque, el kanchan suele ser de los primeros en salir.",
  penchan:
    () => "Un penchan (1-2 u 8-9) espera un solo tipo de tile y, a diferencia del kanchan, solo puede mejorar a ryanmen robando un tile concreto. Es el bloque parcial más débil.",
  ryanmen:
    () => "Romper un ryanmen casi nunca es lo mejor, pero aquí los tiles que pierdes se recuperan con otros bloques de la mano, y lo que conservas acepta más.",
  pair:
    () => "Solo necesitas una pareja como cabeza. Las parejas de más funcionan como esperas de un solo tipo (2 copias), peores que un ryanmen.",
  triplet:
    () => "El cuarto tile de un trío, o un trío que no necesitas, aporta poco: con tres copias ya está completo y la cuarta no mejora nada.",
  sequence:
    (t) => `El ${t} está dentro de un grupo de tiles conectados, pero sobra: quitarlo no rompe ningún bloque necesario y conserva toda la aceptación.`,
};

function list(tiles: Tile[]): string {
  return tiles.map(tileName).join(", ");
}

function copies(option: DiscardOption, tiles: Tile[]): number {
  return option.ukeire.tiles.filter((u) => tiles.includes(u.tile)).reduce((s, u) => s + u.remaining, 0);
}

function blockOf(tile: Tile, blocks: Block[]): Block | undefined {
  // Prefer the most "complete" block containing the tile: that is what you break.
  const order: BlockKind[] = ["shuntsu", "koutsu", "toitsu", "ryanmen", "kanchan", "penchan", "floating"];
  return blocks.filter((b) => b.tiles.includes(tile)).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
}

function pairsReading(counts: number[]): Block[] {
  const blocks: Block[] = [];
  counts.forEach((c, tile) => {
    if (c >= 2) blocks.push({ kind: "toitsu", tiles: [tile, tile] });
    for (let k = c >= 2 ? 2 : 0; k < c; k++) blocks.push({ kind: "floating", tiles: [tile] });
  });
  return blocks;
}

export function explain(problem: Problem, evaluation: HandEvaluation, chosenTile: Tile): Explanation {
  const tiles = problemTiles(problem);
  const counts = toCounts(tiles);
  const correct = evaluation.bestDiscards.includes(chosenTile);
  // When the player picked one of several tied best discards, explain theirs.
  const optimalTile = correct ? chosenTile : representativeDiscard(problem, evaluation);
  const optimal = findOption(evaluation, optimalTile);
  const chosen = findOption(evaluation, chosenTile);

  const after = [...counts];
  after[optimalTile]--;
  const std = standardShanten(after);
  const form: HandForm =
    std <= optimal.shanten ? "standard" : chiitoitsuShanten(after) === optimal.shanten ? "chiitoitsu" : "kokushi";
  const reading = form === "chiitoitsu" ? pairsReading(after) : readHand(after).blocks;

  const optTiles = optimal.ukeire.tiles.map((u) => u.tile);
  const choTiles = chosen.ukeire.tiles.map((u) => u.tile);
  const onlyOptimal = optTiles.filter((t) => !choTiles.includes(t));
  const onlyChosen = choTiles.filter((t) => !optTiles.includes(t));

  const points: string[] = [];
  const opt = tileName(optimalTile);
  const cho = tileName(chosenTile);

  if (correct) {
    points.push(
      `Cortar ${cho} deja la mano en ${SHANTEN_TEXT(chosen.shanten)} con ${chosen.ukeire.total} tiles que la mejoran (${chosen.ukeire.tiles.length} tipos).` +
        (evaluation.bestDiscards.length > 1
          ? ` También valían: ${list(evaluation.bestDiscards.filter((t) => t !== chosenTile))}, con la misma aceptación.`
          : ""),
    );
  } else if (chosen.shanten > optimal.shanten) {
    const reading14 = readHand(counts).blocks;
    const block = blockOf(chosenTile, reading14);
    points.push(
      `Cortar ${cho} empeora la mano: pasas de ${SHANTEN_TEXT(optimal.shanten)} a ${SHANTEN_TEXT(chosen.shanten)}.` +
        (block && block.kind !== "floating" ? ` El ${cho} forma parte de ${BLOCK_TEXT[block.kind]} que la mano necesita.` : ""),
    );
  } else {
    points.push(
      `Los dos descartes dejan la mano en ${SHANTEN_TEXT(optimal.shanten)}, pero cortando ${opt} aceptas ${optimal.ukeire.total} tiles y cortando ${cho} solo ${chosen.ukeire.total}.`,
    );
  }

  if (!correct && onlyOptimal.length > 0) {
    points.push(
      `Lo que pierdes con tu descarte: con ${opt} fuera, también mejoras robando ${list(onlyOptimal)} (${copies(optimal, onlyOptimal)} tiles).` +
        (onlyChosen.length > 0
          ? ` A cambio, tu descarte acepta ${list(onlyChosen)} (${copies(chosen, onlyChosen)} tiles), que compensa menos.`
          : ""),
    );
  }

  if (form === "chiitoitsu") {
    points.push(
      "La mano está más cerca de chiitoitsu (siete parejas) que de la forma normal: se conservan las parejas y se cortan los tiles que no pueden emparejarse con facilidad.",
    );
  } else if (form === "kokushi") {
    points.push("La mano va a kokushi (trece huérfanos): se conservan terminales y honores distintos y se cortan los tiles centrales.");
  } else {
    const shape = classifyTile(optimalTile, counts);
    const reading14 = readHand(counts);
    const partials = reading14.blocks.filter((b) => ["toitsu", "ryanmen", "penchan", "kanchan"].includes(b.kind)).length;
    const blocks = reading14.melds + partials;
    const optBlock = blockOf(optimalTile, reading14.blocks);
    if (blocks > 5 && optBlock && optBlock.kind !== "floating") {
      points.push(
        `Tienes ${blocks} bloques (grupos, parejas y esperas) y una mano solo usa 5: cuatro grupos y la pareja. Sobra uno, y se corta el más débil: ${BLOCK_TEXT[optBlock.kind]}.`,
      );
    }
    points.push(PRINCIPLE[shape](tileName(optimalTile)));
  }

  return { form, reading, optimal, chosen, correct, onlyOptimal, onlyChosen, points };
}
