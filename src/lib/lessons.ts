import { Problem, parseHand, sortTiles } from "@/lib/mahjong";

/**
 * Hand-picked teaching problems. Each one is checked against the engine in
 * lessons.test.ts (expected best discards and the tile counts quoted in the
 * text), so the explanations cannot drift from what the app computes.
 */
export interface Lesson {
  id: string;
  title: string;
  /** 13 tiles before the draw, compact notation. */
  hand: string;
  draw: string;
  /** Optimal discards, compact notation (all tied answers). */
  best: string[];
  /** Shown after answering. */
  explanation: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: "isolated-honor",
    title: "Fuera lo que no conecta",
    hand: "234m789p111z45s79s",
    draw: "5z",
    best: ["5z"],
    explanation: [
      "Tienes dos secuencias (234m y 789p), el trío de Este y dos esperas: 4-5s y 7-9s. Solo te falta la pareja.",
      "El Haku no forma parte de nada: solo te serviría si robas otro Haku. Al cortarlo conservas todas las esperas: 3s, 6s y 8s completan un grupo, y 4s, 5s, 7s o 9s te dan la pareja. En total, 24 tiles.",
      "Regla práctica: corta primero los honores aislados, después los terminales aislados y luego los tiles sueltos del centro.",
    ],
  },
  {
    id: "kanchan-vs-penchan",
    title: "Kanchan contra penchan",
    hand: "234m567p11z45s79p1s",
    draw: "2s",
    best: ["1s", "2s"],
    explanation: [
      "Una mano completa son cuatro grupos y una pareja. Tienes dos grupos hechos (234m y 567p) y la pareja de Este, así que necesitas dos esperas más. Tienes tres: 4-5s, 7-9p y 1-2s. Una sobra.",
      "El penchan 1-2s es la más débil: solo espera el 3s, y ese 3s ya lo espera el 4-5s. Cortándolo no pierdes ningún tipo de tile: sigues aceptando 3s, 6s y 8p (12 tiles).",
      "Si cortas del kanchan 7-9p, pierdes el 8p y te quedas con 8 tiles.",
    ],
  },
  {
    id: "ryanmen-vs-kanchan",
    title: "Ryanmen contra kanchan",
    hand: "234m567p11z45s79p6m",
    draw: "7m",
    best: ["7p", "9p"],
    explanation: [
      "Otra vez sobra una espera: tienes 4-5s, 6-7m y 7-9p, y solo necesitas dos.",
      "El 4-5s y el 6-7m son ryanmen: cada uno espera dos tipos de tile (hasta 8 copias). El 7-9p es un kanchan: solo espera el 8p (4 copias).",
      "Rompe el kanchan. Te quedas con 3s, 6s, 5m y 8m: 16 tiles, frente a los 12 que tendrías rompiendo un ryanmen.",
    ],
  },
  {
    id: "ryankan",
    title: "Ryankan: 1-3-5-7",
    hand: "357m567p789s11z45s",
    draw: "1m",
    best: ["1m", "7m"],
    explanation: [
      "1-3-5-7m es una cadena de kanchan solapados (1-3, 3-5 y 5-7). No necesitas los cuatro tiles para formar un grupo.",
      "Cortando un extremo te quedas con 3-5-7m, que espera el 4m y el 6m: dos tipos, tan bueno como un ryanmen. Con el 3s y el 6s del 4-5s suman 16 tiles.",
      "Si cortas el 3m o el 5m, te queda un solo kanchan útil y bajas a 12 tiles.",
    ],
  },
  {
    id: "kuttsuki",
    title: "Tiles sueltos: quédate con los centrales",
    hand: "234m567p789s11z4m6p",
    draw: "9p",
    best: ["9p"],
    explanation: [
      "Tienes tres grupos y la pareja: solo te falta el cuarto grupo, y saldrá de un tile suelto (4m, 6p o 9p).",
      "Cada tile suelto mejora la mano sobre todo con los tiles que forman bloque con él. El 6p conecta directamente con 4p, 5p, 6p, 7p y 8p; el 9p, solo con 7p, 8p y 9p. El 4m, pegado al 234m, es el más valioso de los tres.",
      "Corta el más pobre: el 9p. Los terminales sueltos se cortan antes que los tiles del centro.",
    ],
  },
  {
    id: "tenpai-wait",
    title: "Tenpai: elige la espera más amplia",
    hand: "123m456789p11z45s",
    draw: "7s",
    best: ["7s"],
    explanation: [
      "Ya puedes estar en tenpai de dos formas.",
      "Cortando el 7s esperas 3s o 6s (ryanmen): 8 tiles. Cortando el 4s esperas solo el 6s (kanchan 5-7s): 4 tiles.",
      "Mismo shanten y el doble de tiles: quédate con el ryanmen.",
    ],
  },
  {
    id: "ryanmen-vs-shanpon",
    title: "Ryanmen mejor que shanpon",
    hand: "234m567p789s115s6s",
    draw: "5s",
    best: ["5s"],
    explanation: [
      "Puedes quedarte con dos parejas (1s y 5s) o con una pareja y el 5-6s.",
      "Dos parejas son un shanpon: esperas el 1s o el 5s, pero solo quedan 2 copias de cada uno, 4 tiles en total.",
      "Con 11s + 56s esperas 4s o 7s. Ya ves un 7s en tu 789s, así que quedan 4 + 3 = 7 tiles. El ryanmen gana.",
    ],
  },
  {
    id: "nobetan",
    title: "Formas de cuatro tiles: el nobetan",
    hand: "234m567p789s3456s",
    draw: "7z",
    best: ["7z"],
    explanation: [
      "Corta el Chun y quédate con 3-4-5-6s: estás en tenpai.",
      "3456s espera el 3s (3 + 456) o el 6s (345 + 6): es un nobetan. Además, junto a tu 789s, el 9s también completa la mano (345 + 678 + 99).",
      "Tres tipos de espera, 9 tiles. Las formas de cuatro tiles conectados suelen esperar más de lo que parece.",
    ],
  },
  {
    id: "chiitoitsu",
    title: "Siete parejas (chiitoitsu)",
    hand: "1133m5577p99s1z2z3z",
    draw: "4z",
    best: ["1z", "2z", "3z", "4z"],
    explanation: [
      "Cinco parejas y cuatro honores sueltos. Por la forma normal la mano está lejos, pero para siete parejas solo te faltan dos: estás a 1-shanten de chiitoitsu.",
      "Corta cualquier honor: los cuatro valen lo mismo. Te quedan tres honores, y cada uno puede emparejarse con 3 copias: 9 tiles.",
      "Con cinco o más parejas, piensa en chiitoitsu.",
    ],
  },
];

export function lessonProblem(lesson: Lesson): Problem {
  return { hand: sortTiles(parseHand(lesson.hand)), draw: parseHand(lesson.draw)[0] };
}
