"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HandEvaluation, Problem, evaluateHand, findOption, generateProblem, isSameValue } from "@/lib/mahjong";

export interface Difficulty {
  id: string;
  label: string;
  minShanten: number;
  maxShanten: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "easy", label: "Fácil (tenpai–1 shanten)", minShanten: 0, maxShanten: 1 },
  { id: "normal", label: "Normal (1–2 shanten)", minShanten: 1, maxShanten: 2 },
  { id: "hard", label: "Difícil (2–3 shanten)", minShanten: 2, maxShanten: 3 },
];

export interface Score {
  correct: number;
  total: number;
  streak: number;
}

/**
 * GameController: orchestrates generate → render → validate → next problem.
 * Problems are generated after mount so server and client markup match.
 */
export function useGameController() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[1]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [score, setScore] = useState<Score>({ correct: 0, total: 0, streak: 0 });

  const nextProblem = useCallback((d: Difficulty = difficulty) => {
    setProblem(generateProblem({ minShanten: d.minShanten, maxShanten: d.maxShanten }));
    setChosenIndex(null);
  }, [difficulty]);

  useEffect(() => {
    // Random generation must not run during SSR/static export.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    nextProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluation: HandEvaluation | null = useMemo(
    () => (problem ? evaluateHand([...problem.hand, problem.draw]) : null),
    [problem],
  );

  const tiles = problem ? [...problem.hand, problem.draw] : [];
  const chosen = evaluation && chosenIndex !== null ? findOption(evaluation, tiles[chosenIndex]) : null;
  const correct = chosen && evaluation ? isSameValue(chosen, evaluation.options[0]) : null;

  const discard = (index: number) => {
    if (!evaluation || chosenIndex !== null) return;
    const option = findOption(evaluation, tiles[index]);
    const ok = isSameValue(option, evaluation.options[0]);
    setChosenIndex(index);
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
  };

  const changeDifficulty = (id: string) => {
    const d = DIFFICULTIES.find((x) => x.id === id) ?? DIFFICULTIES[1];
    setDifficulty(d);
    nextProblem(d);
  };

  return { problem, evaluation, chosenIndex, chosen, correct, score, difficulty, discard, nextProblem: () => nextProblem(), changeDifficulty };
}
