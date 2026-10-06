"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttemptRecord, Stats, fetchStats, flushAttempts, saveAttempt } from "@/lib/api";
import { LESSONS, lessonProblem } from "@/lib/lessons";
import {
  CategoryStats,
  HandEvaluation,
  Problem,
  Shape,
  classifyTile,
  evaluateHand,
  explain,
  findOption,
  formatHand,
  generateProblem,
  generateProblemOfCategory,
  isSameValue,
  pickReviewCategory,
  problemCategory,
  problemTiles,
  tileToString,
  toCounts,
} from "@/lib/mahjong";

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

export type Mode = "normal" | "review" | "lessons";

/** Lesson id -> answered correctly at least once. Kept per device. */
type LessonProgress = Record<string, boolean>;
const LESSONS_KEY = "nanikiru:lessons";

function loadLessonProgress(): LessonProgress {
  try {
    return JSON.parse(localStorage.getItem(LESSONS_KEY) ?? "{}") as LessonProgress;
  } catch {
    return {};
  }
}

function storeLessonProgress(progress: LessonProgress) {
  try {
    localStorage.setItem(LESSONS_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable: progress lasts for this session only.
  }
}

export interface Score {
  correct: number;
  total: number;
  streak: number;
}

function addResult(stats: Stats, category: Shape, ok: boolean): Stats {
  const found = stats.categories.some((c) => c.category === category);
  const categories: CategoryStats[] = found
    ? stats.categories.map((c) => (c.category === category ? { ...c, total: c.total + 1, correct: c.correct + (ok ? 1 : 0) } : c))
    : [...stats.categories, { category, total: 1, correct: ok ? 1 : 0 }];
  return { categories, overall: { total: stats.overall.total + 1, correct: stats.overall.correct + (ok ? 1 : 0) } };
}

/**
 * GameController: orchestrates generate → render → validate → next problem,
 * and records each attempt for error-category review.
 * Problems are generated after mount so server and client markup match.
 */
export function useGameController() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[1]);
  const [mode, setMode] = useState<Mode>("normal");
  const [problem, setProblem] = useState<Problem | null>(null);
  /** Category being reviewed for the current problem (review mode only). */
  const [reviewCategory, setReviewCategory] = useState<Shape | null>(null);
  const [generating, setGenerating] = useState(false);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [score, setScore] = useState<Score>({ correct: 0, total: 0, streak: 0 });
  const [stats, setStats] = useState<Stats>({ categories: [], overall: { total: 0, correct: 0 } });
  const [statsSynced, setStatsSynced] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress>({});

  // Latest stats for generation without re-creating callbacks on every answer.
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const nextProblem = useCallback(
    (d: Difficulty = difficulty, m: Mode = mode, lesson?: number) => {
      if (m === "lessons") {
        const idx = lesson ?? lessonIndex;
        setLessonIndex(idx);
        setProblem(lessonProblem(LESSONS[idx]));
        setReviewCategory(null);
        setChosenIndex(null);
        return;
      }
      setGenerating(true);
      // Defer so the "generating" state paints; rare review categories can take a moment.
      setTimeout(() => {
        const range = { minShanten: d.minShanten, maxShanten: d.maxShanten };
        const category = m === "review" ? pickReviewCategory(statsRef.current.categories) : null;
        const reviewProblem = category ? generateProblemOfCategory(category, range) : null;
        setProblem(reviewProblem ?? generateProblem(range));
        setReviewCategory(reviewProblem ? category : null);
        setChosenIndex(null);
        setGenerating(false);
      }, 0);
    },
    [difficulty, mode, lessonIndex],
  );

  useEffect(() => {
    // Random generation must not run during SSR/static export.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    nextProblem();
    setLessonProgress(loadLessonProgress());
    void flushAttempts();
    fetchStats().then((s) => {
      if (!s) return;
      setStats(s);
      setStatsSynced(true);
    });
    const onOnline = () => void flushAttempts();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluation: HandEvaluation | null = useMemo(() => (problem ? evaluateHand(problemTiles(problem)) : null), [problem]);
  const category = useMemo(() => (problem && evaluation ? problemCategory(problem, evaluation) : null), [problem, evaluation]);

  const tiles = problem ? problemTiles(problem) : [];
  const chosen = evaluation && chosenIndex !== null ? findOption(evaluation, tiles[chosenIndex]) : null;
  const correct = chosen && evaluation ? isSameValue(chosen, evaluation.options[0]) : null;
  const explanation = useMemo(
    () => (problem && evaluation && chosenIndex !== null ? explain(problem, evaluation, problemTiles(problem)[chosenIndex]) : null),
    [problem, evaluation, chosenIndex],
  );
  const lesson = mode === "lessons" ? LESSONS[lessonIndex] : null;

  const discard = (index: number) => {
    if (!problem || !evaluation || !category || chosenIndex !== null || generating) return;
    const option = findOption(evaluation, tiles[index]);
    const best = evaluation.options[0];
    const ok = isSameValue(option, best);
    setChosenIndex(index);

    if (mode === "lessons") {
      // Lessons are for learning: they don't count towards score, stats or review.
      const id = LESSONS[lessonIndex].id;
      setLessonProgress((p) => {
        const next = { ...p, [id]: p[id] || ok };
        storeLessonProgress(next);
        return next;
      });
      return;
    }

    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
    setStats((s) => addResult(s, category, ok));

    const record: AttemptRecord = {
      hand: formatHand(problem.hand),
      draw: tileToString(problem.draw),
      discardChosen: tileToString(option.discard),
      discardOptimal: evaluation.bestDiscards.map(tileToString),
      wasCorrect: ok,
      shanten: best.shanten,
      ukeireChosen: option.ukeire.total,
      ukeireOptimal: best.ukeire.total,
      category,
      chosenShape: classifyTile(option.discard, toCounts(tiles)),
    };
    saveAttempt(record);
  };

  const changeDifficulty = (id: string) => {
    const d = DIFFICULTIES.find((x) => x.id === id) ?? DIFFICULTIES[1];
    setDifficulty(d);
    nextProblem(d, mode);
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    nextProblem(difficulty, m);
  };

  const selectLesson = (idx: number) => nextProblem(difficulty, "lessons", idx);

  return {
    problem,
    evaluation,
    category,
    reviewCategory,
    generating,
    chosenIndex,
    chosen,
    correct,
    score,
    stats,
    statsSynced,
    difficulty,
    mode,
    discard,
    explanation,
    lesson,
    lessonIndex,
    lessonProgress,
    selectLesson,
    nextProblem: () => nextProblem(difficulty, mode, mode === "lessons" ? (lessonIndex + 1) % LESSONS.length : undefined),
    changeDifficulty,
    changeMode,
  };
}
