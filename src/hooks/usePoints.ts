import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PointsData {
  totalPoints: number;
  dailyStreak: number;
}

export function usePoints(userId: string | undefined) {
  const [points, setPoints] = useState<PointsData>({ totalPoints: 0, dailyStreak: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_points")
      .select("total_points, daily_streak")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setPoints({ totalPoints: data.total_points, dailyStreak: data.daily_streak });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const awardPoints = useCallback(async (amount: number, reason: string, roomId?: string) => {
    if (!userId) return;

    // Upsert user_points
    const { data: existing } = await supabase
      .from("user_points")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_points")
        .update({ total_points: existing.total_points + amount, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_points")
        .insert({ user_id: userId, total_points: amount });
    }

    // Log history
    const historyRow: any = { user_id: userId, amount, reason };
    if (roomId) historyRow.room_id = roomId;
    await supabase.from("points_history").insert(historyRow);

    setPoints((prev) => ({ ...prev, totalPoints: (prev.totalPoints || 0) + amount }));
    if (amount > 0) {
      toast.success(`+${amount} points: ${reason}`);
    }
  }, [userId]);

  const spendPoints = useCallback(async (amount: number, reason: string): Promise<boolean> => {
    if (!userId) return false;
    if (points.totalPoints < amount) {
      toast.error("Not enough points!");
      return false;
    }

    const { error } = await supabase
      .from("user_points")
      .update({ total_points: points.totalPoints - amount, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to spend points");
      return false;
    }

    await supabase.from("points_history").insert({ user_id: userId, amount: -amount, reason });
    setPoints((prev) => ({ ...prev, totalPoints: prev.totalPoints - amount }));
    return true;
  }, [userId, points.totalPoints]);

  return { points, loading, awardPoints, spendPoints, refreshPoints: fetchPoints };
}
