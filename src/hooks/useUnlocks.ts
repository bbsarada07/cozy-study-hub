import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnlockInfo {
  feature_name: string;
  unlocked_at: string;
  expires_at: string | null;
}

export const STORE_ITEMS = [
  {
    id: "blurting_method",
    name: "Blurting Method",
    emoji: "🧠",
    cost: 50,
    description: "Write everything you remember, then compare with AI. Available for 24 hours.",
    duration: 24 * 60 * 60 * 1000, // 24h in ms
  },
  {
    id: "advanced_quiz_filters",
    name: "Advanced Quiz Filters",
    emoji: "🔍",
    cost: 30,
    description: "Filter questions by subtopic and difficulty. Permanent unlock.",
    duration: null, // permanent
  },
  {
    id: "ai_tutor_chat",
    name: "AI Tutor Chat",
    emoji: "🤖",
    cost: 100,
    description: "Dedicated AI tutor for follow-up questions. Available for 7 days.",
    duration: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "custom_question_paper",
    name: "Custom Question Paper",
    emoji: "📝",
    cost: 80,
    description: "Generate a full-length exam paper with answer key. One-time use.",
    duration: null,
  },
] as const;

export function useUnlocks(userId: string | undefined) {
  const [unlocks, setUnlocks] = useState<UnlockInfo[]>([]);

  const fetchUnlocks = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_unlocks")
      .select("feature_name, unlocked_at, expires_at")
      .eq("user_id", userId);
    setUnlocks(data || []);
  }, [userId]);

  useEffect(() => { fetchUnlocks(); }, [fetchUnlocks]);

  const isUnlocked = useCallback((featureId: string): boolean => {
    const unlock = unlocks.find((u) => u.feature_name === featureId);
    if (!unlock) return false;
    if (unlock.expires_at && new Date(unlock.expires_at) < new Date()) return false;
    return true;
  }, [unlocks]);

  const unlockFeature = useCallback(async (featureId: string, expiresAt: string | null) => {
    if (!userId) return;
    await supabase.from("user_unlocks").upsert({
      user_id: userId,
      feature_name: featureId,
      unlocked_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "user_id,feature_name" });
    await fetchUnlocks();
  }, [userId, fetchUnlocks]);

  return { unlocks, isUnlocked, unlockFeature, refreshUnlocks: fetchUnlocks };
}
