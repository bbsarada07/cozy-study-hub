import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TreePine, Gamepad2 } from "lucide-react";
import { usePomodoroContext } from "@/contexts/PomodoroContext";

const FONT = "'Times New Roman', Times, serif";

const BreakPage = () => {
  const navigate = useNavigate();
  const { phase, formatted, progress } = usePomodoroContext();

  useEffect(() => {
    if (phase === "idle") navigate("/library", { replace: true });
    if (phase === "focus") navigate("/focus", { replace: true });
  }, [phase, navigate]);

  const circumference = 2 * Math.PI * 120;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{
        fontFamily: FONT,
        background: "linear-gradient(180deg, hsl(150 30% 94%) 0%, hsl(200 25% 92%) 100%)",
      }}
    >
      <h1 className="mb-2 text-2xl font-bold text-warm-brown">Break Time 🌿</h1>
      <p className="mb-8 text-sm text-muted-foreground">Relax — you earned it!</p>

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg width="240" height="240" className="-rotate-90">
          <circle cx="120" cy="120" r="100" fill="none" stroke="hsl(150 25% 85%)" strokeWidth="8" />
          <circle
            cx="120"
            cy="120"
            r="100"
            fill="none"
            stroke="hsl(150 50% 45%)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 100 * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute text-4xl font-bold text-warm-brown">{formatted}</span>
      </div>

      {/* Break options */}
      <div className="mt-10 flex gap-4">
        <button
          className="flex flex-col items-center gap-2 rounded-2xl px-6 py-4 shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: "hsl(150 30% 90%)", border: "1px solid hsl(150 25% 80%)" }}
        >
          <TreePine className="h-8 w-8 text-warm-brown" />
          <span className="text-sm font-semibold text-warm-brown">Meditation</span>
        </button>
        <button
          className="flex flex-col items-center gap-2 rounded-2xl px-6 py-4 shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: "hsl(210 30% 90%)", border: "1px solid hsl(210 25% 80%)" }}
        >
          <Gamepad2 className="h-8 w-8 text-warm-brown" />
          <span className="text-sm font-semibold text-warm-brown">Brain Games</span>
        </button>
      </div>
    </div>
  );
};

export default BreakPage;
