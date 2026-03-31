import { createContext, useContext, type ReactNode } from "react";
import { usePomodoro } from "@/hooks/usePomodoro";

type PomodoroContextType = ReturnType<typeof usePomodoro>;

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const pomodoro = usePomodoro();
  return (
    <PomodoroContext.Provider value={pomodoro}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoroContext = () => {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoroContext must be used within PomodoroProvider");
  return ctx;
};
