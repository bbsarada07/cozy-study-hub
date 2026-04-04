import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnlockInfo {
  feature_name: string;
  unlocked_at: string;
  expires_at: string | null;
}

export const STORE_ITEMS = [
  {
    id: "flashcards",
    name: "Flashcards",
    emoji: "🃏",
    cost: 0,
    description: "Create and review flashcards for any topic. Always available.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "advanced_quiz_filters",
    name: "Advanced Quiz Filters",
    emoji: "🔍",
    cost: 30,
    description: "Filter questions by subtopic and difficulty. Permanent unlock.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "blurting_method",
    name: "Blurting Method",
    emoji: "🧠",
    cost: 50,
    description: "Write everything you remember, then compare with AI. Available for 24 hours.",
    duration: 24 * 60 * 60 * 1000,
    category: "study" as const,
  },
  {
    id: "custom_question_paper",
    name: "Custom Question Paper",
    emoji: "📝",
    cost: 80,
    description: "Generate a full-length exam paper with answer key. One-time use.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "ai_tutor_chat",
    name: "AI Tutor Chat",
    emoji: "🤖",
    cost: 100,
    description: "Dedicated AI tutor for follow-up questions. Available for 7 days.",
    duration: 7 * 24 * 60 * 60 * 1000,
    category: "ai" as const,
  },
  {
    id: "mind_maps",
    name: "Mind Maps",
    emoji: "🗺️",
    cost: 150,
    description: "Generate visual mind maps from any topic or file. Permanent unlock.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "feynman_technique",
    name: "Feynman Technique",
    emoji: "🎓",
    cost: 250,
    description: "Explain a concept in simple terms and get AI feedback. Permanent unlock.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "cheat_sheets",
    name: "Cheat Sheets",
    emoji: "📋",
    cost: 300,
    description: "AI-generated concise cheat sheets for any topic. Permanent unlock.",
    duration: null,
    category: "study" as const,
  },
  {
    id: "spaced_repetition",
    name: "Spaced Repetition",
    emoji: "🔄",
    cost: 400,
    description: "Smart review scheduler based on forgetting curves. Permanent unlock.",
    duration: null,
    category: "ai" as const,
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
    // Flashcards are always unlocked
    if (featureId === "flashcards") return true;
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

  const getRecommendation = useCallback((): typeof STORE_ITEMS[number] | null => {
    // Recommend cheapest locked item
    const locked = STORE_ITEMS.filter(item => item.cost > 0 && !isUnlocked(item.id));
    if (locked.length === 0) return null;
    return locked.reduce((a, b) => a.cost < b.cost ? a : b);
  }, [isUnlocked]);

  return { unlocks, isUnlocked, unlockFeature, refreshUnlocks: fetchUnlocks, getRecommendation };
}
