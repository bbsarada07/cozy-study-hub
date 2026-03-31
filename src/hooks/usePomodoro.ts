import { useState, useEffect, useCallback, useRef } from "react";

export type PomodoroPhase = "focus" | "break" | "idle";

interface PomodoroState {
  timeRemaining: number;
  isRunning: boolean;
  phase: PomodoroPhase;
}

const FOCUS_DURATION = 25 * 60; // 1500 seconds
const BREAK_DURATION = 5 * 60;  // 300 seconds

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>({
    timeRemaining: FOCUS_DURATION,
    isRunning: false,
    phase: "idle",
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Core tick logic
  useEffect(() => {
    clearTimer();
    if (!state.isRunning || state.phase === "idle") return;

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeRemaining <= 1) {
          // Timer complete
          if (prev.phase === "focus") {
            return {
              timeRemaining: BREAK_DURATION,
              isRunning: true,
              phase: "break",
            };
          }
          // Break complete → idle
          return { timeRemaining: FOCUS_DURATION, isRunning: false, phase: "idle" };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return clearTimer;
  }, [state.isRunning, state.phase, clearTimer]);

  const startFocus = useCallback(() => {
    setState({ timeRemaining: FOCUS_DURATION, isRunning: true, phase: "focus" });
  }, []);

  const pause = useCallback(() => {
    setState((p) => ({ ...p, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setState((p) => (p.phase !== "idle" ? { ...p, isRunning: true } : p));
  }, []);

  const quit = useCallback(() => {
    clearTimer();
    setState({ timeRemaining: FOCUS_DURATION, isRunning: false, phase: "idle" });
  }, [clearTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress =
    state.phase === "focus"
      ? 1 - state.timeRemaining / FOCUS_DURATION
      : state.phase === "break"
        ? 1 - state.timeRemaining / BREAK_DURATION
        : 0;

  return {
    ...state,
    formatted: formatTime(state.timeRemaining),
    progress,
    startFocus,
    pause,
    resume,
    quit,
  };
}
