"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttemptRecord, Stats, fetchStats, flushAttempts, saveAttempt } from "@/lib/api";
import { LESSONS, lessonProblem } from "@/lib/lessons";
import { generatePracticeProblem } from "@/lib/lessonPractice";
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
  generateClearProblem,
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

export type Mode = "normal" | "review" | "lessons" | "analyze";

/** Practice problems after each lesson's worked example. */
export const PRACTICE_PER_LESSON = 5;
/** Steps per lesson: the worked example (step 0) plus the practice problems. */
export const LESSON_STEPS = 1 + PRACTICE_PER_LESSON;

/** Per lesson: correct answers in the latest run and whether it was ever finished. Kept per device. */
export interface LessonResult {
  correct: number;
  answered: number;
  completed: boolean;
}
type LessonProgress = Record<string, LessonResult>;
const LESSONS_KEY = "nanikiru:lessons-v2";

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

/** Where the player left off, restored when the app is reopened. Kept per device. */
interface SavedSession {
  mode: Mode;
  difficultyId: string;
  /** By id, so adding or reordering lessons doesn't move the player. */
  lessonId: string;
  lessonStep: number;
  /** Current problem, if it was still unanswered. */
  problem: Problem | null;
  reviewCategory: Shape | null;
  answered: boolean;
  score: Score;
}
const SESSION_KEY = "nanikiru:session";

function loadSession(): SavedSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as SavedSession | null;
    if (!s || !["normal", "review", "lessons", "analyze"].includes(s.mode)) return null;
    // Reject a corrupted or outdated saved hand rather than crash on it.
    if (s.problem) evaluateHand(problemTiles(s.problem));
    return s;
  } catch {
    return null;
  }
}

function storeSession(session: SavedSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the app simply starts fresh next time.
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
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonStep, setLessonStep] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress>({});
  // Don't persist anything until the saved session has been restored.
  const [restored, setRestored] = useState(false);

  // Latest stats for generation without re-creating callbacks on every answer.
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const nextProblem = useCallback(
    (d: Difficulty = difficulty, m: Mode = mode, lesson?: number, step = 0) => {
      // Hand analysis has its own view and state (AnalyzeView).
      if (m === "analyze") {
        setProblem(null);
        setChosenIndex(null);
        return;
      }
      if (m === "lessons") {
        const idx = lesson ?? lessonIndex;
        setLessonIndex(idx);
        setLessonStep(step);
        // Step 0 is the worked example; later steps are fresh hands of the same concept.
        const practice = step > 0 ? generatePracticeProblem(LESSONS[idx].id) : null;
        setProblem(practice ?? lessonProblem(LESSONS[idx]));
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
        setProblem(reviewProblem ?? generateClearProblem(range));
        setReviewCategory(reviewProblem ? category : null);
        setChosenIndex(null);
        setGenerating(false);
      }, 0);
    },
    [difficulty, mode, lessonIndex],
  );

  useEffect(() => {
    // Restore where the player left off. Random generation must not run during SSR/static export.
    const saved = loadSession();
    const d = DIFFICULTIES.find((x) => x.id === saved?.difficultyId) ?? DIFFICULTIES[1];
    const m = saved?.mode ?? "normal";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDifficulty(d);
    setMode(m);
    if (saved) setScore(saved.score);
    if (m === "lessons") {
      const idx = Math.max(LESSONS.findIndex((l) => l.id === saved?.lessonId), 0);
      const step = Math.min(Math.max(saved?.lessonStep ?? 0, 0), LESSON_STEPS - 1);
      if (saved?.answered) {
        const [nextIdx, nextStep] = step + 1 < LESSON_STEPS ? [idx, step + 1] : [(idx + 1) % LESSONS.length, 0];
        nextProblem(d, m, nextIdx, nextStep);
      } else if (saved?.problem && step > 0) {
        setLessonIndex(idx);
        setLessonStep(step);
        setProblem(saved.problem);
      } else {
        nextProblem(d, m, idx, step);
      }
    } else if (saved?.problem && !saved.answered) {
      setProblem(saved.problem);
      setReviewCategory(saved.reviewCategory);
    } else {
      nextProblem(d, m);
    }
    setRestored(true);
    setLessonProgress(loadLessonProgress());
    void flushAttempts();
    fetchStats().then((r) => {
      if (!r.ok) return setStatsError(r.reason);
      setStats(r.stats);
      setStatsSynced(true);
    });
    const onOnline = () => void flushAttempts();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    storeSession({
      mode,
      difficultyId: difficulty.id,
      lessonId: LESSONS[lessonIndex].id,
      lessonStep,
      problem: mode === "lessons" && lessonStep === 0 ? null : problem,
      reviewCategory,
      answered: chosenIndex !== null,
      score,
    });
  }, [restored, mode, difficulty, lessonIndex, lessonStep, problem, reviewCategory, chosenIndex, score]);

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
        // Starting a lesson (its worked example) begins a new run.
        const prev = lessonStep === 0 ? { correct: 0, answered: 0, completed: false } : (p[id] ?? { correct: 0, answered: 0, completed: false });
        const result: LessonResult = {
          correct: prev.correct + (ok ? 1 : 0),
          answered: prev.answered + 1,
          completed: (p[id]?.completed ?? false) || lessonStep === LESSON_STEPS - 1,
        };
        const next = { ...p, [id]: result };
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

  const selectLesson = (idx: number) => nextProblem(difficulty, "lessons", idx, 0);

  const next = () => {
    if (mode !== "lessons") return nextProblem(difficulty, mode);
    if (lessonStep + 1 < LESSON_STEPS) return nextProblem(difficulty, mode, lessonIndex, lessonStep + 1);
    nextProblem(difficulty, mode, (lessonIndex + 1) % LESSONS.length, 0);
  };

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
    statsError,
    difficulty,
    mode,
    discard,
    explanation,
    lesson,
    lessonIndex,
    lessonStep,
    lessonProgress,
    selectLesson,
    nextProblem: next,
    changeDifficulty,
    changeMode,
  };
}
