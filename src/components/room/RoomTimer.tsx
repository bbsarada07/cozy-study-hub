import { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";
const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

interface Props {
  roomId: string;
  user: User;
}

const RoomTimer = ({ roomId, user }: Props) => {
  const [timeRemaining, setTimeRemaining] = useState(FOCUS_DURATION);
  const [phase, setPhase] = useState<"idle" | "focus" | "break">("idle");
  const [endTime, setEndTime] = useState<Date | null>(null);

  const fetchTimer = useCallback(async () => {
    const { data } = await supabase
      .from("room_timer")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (data) {
      setPhase(data.phase as any);
      if (data.end_time && data.phase !== "idle") {
        const end = new Date(data.end_time);
        setEndTime(end);
        const remaining = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
        setTimeRemaining(remaining);
      } else {
        setEndTime(null);
        setTimeRemaining(data.phase === "break" ? BREAK_DURATION : FOCUS_DURATION);
      }
    }
  }, [roomId]);

  useEffect(() => {
    fetchTimer();

    const channel = supabase
      .channel(`room-timer-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_timer", filter: `room_id=eq.${roomId}` }, () => fetchTimer())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchTimer]);

  // Countdown tick
  useEffect(() => {
    if (phase === "idle" || !endTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Auto-transition
        if (phase === "focus") {
          const newEnd = new Date(Date.now() + BREAK_DURATION * 1000);
          supabase.from("room_timer").update({
            phase: "break",
            end_time: newEnd.toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("room_id", roomId).then();
        } else {
          supabase.from("room_timer").update({
            phase: "idle",
            end_time: null,
            updated_at: new Date().toISOString(),
          }).eq("room_id", roomId).then();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [phase, endTime, roomId]);

  const startTimer = async () => {
    const end = new Date(Date.now() + FOCUS_DURATION * 1000);

    // Upsert timer row
    const { data: existing } = await supabase
      .from("room_timer")
      .select("id")
      .eq("room_id", roomId)
      .single();

    if (existing) {
      await supabase.from("room_timer").update({
        phase: "focus",
        end_time: end.toISOString(),
        started_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq("room_id", roomId);
    } else {
      await supabase.from("room_timer").insert({
        room_id: roomId,
        phase: "focus",
        end_time: end.toISOString(),
        started_by: user.id,
      });
    }
  };

  const resetTimer = async () => {
    await supabase.from("room_timer").update({
      phase: "idle",
      end_time: null,
      updated_at: new Date().toISOString(),
    }).eq("room_id", roomId);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const total = phase === "break" ? BREAK_DURATION : FOCUS_DURATION;
  const progress = phase !== "idle" ? 1 - timeRemaining / total : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-secondary bg-card px-4 py-2 shadow-sm" style={{ fontFamily: FONT }}>
      {/* Mini circular progress */}
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke={phase === "break" ? "hsl(142, 71%, 45%)" : "hsl(var(--primary))"}
            strokeWidth="3"
            strokeDasharray={`${progress * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex-1">
        <p className="text-lg font-bold tabular-nums text-warm-brown">{formatTime(timeRemaining)}</p>
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          {phase === "idle" ? "Ready" : phase === "focus" ? "Focus Mode" : "Break Time"}
        </p>
      </div>

      {phase === "idle" ? (
        <button onClick={startTimer} className="rounded-full bg-primary p-2 text-primary-foreground">
          <Play className="h-4 w-4" />
        </button>
      ) : (
        <button onClick={resetTimer} className="rounded-full bg-secondary p-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default RoomTimer;
