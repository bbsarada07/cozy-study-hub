import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pause, Play, X } from "lucide-react";
import { usePomodoroContext } from "@/contexts/PomodoroContext";

const FONT = "'Times New Roman', Times, serif";

const FocusPage = () => {
  const navigate = useNavigate();
  const { phase, isRunning, formatted, progress, pause, resume, quit } =
    usePomodoroContext();

  // Auto-navigate to break when phase switches
  useEffect(() => {
    if (phase === "break") navigate("/break", { replace: true });
    if (phase === "idle") navigate("/library", { replace: true });
  }, [phase, navigate]);

  const handleQuit = () => {
    quit();
    navigate("/library");
  };

  const circumference = 2 * Math.PI * 120;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background"
      style={{ fontFamily: FONT }}
    >
      {/* Top bar */}
      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-4">
        <button onClick={handleQuit} className="text-warm-brown">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold text-warm-brown">Focus Mode 📖</h1>
        <button onClick={handleQuit} className="text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center">
        <svg width="280" height="280" className="-rotate-90">
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
          />
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-bold text-warm-brown">{formatted}</span>
          <span className="mt-1 text-sm text-muted-foreground">
            {isRunning ? "Stay focused…" : "Paused"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-10 flex gap-6">
        {isRunning ? (
          <button
            onClick={pause}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
          >
            <Pause className="h-7 w-7" />
          </button>
        ) : (
          <button
            onClick={resume}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
          >
            <Play className="h-7 w-7" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FocusPage;
