import { useState, useEffect, useCallback } from "react";
import { Send, Bot, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";

interface Props {
  roomId: string;
  user: User;
}

const RoomQA = ({ roomId, user }: Props) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQ, setNewQ] = useState("");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from("room_questions")
      .select("*, profiles:user_id(username), room_answers(*, profiles:user_id(username))")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setQuestions(data || []);
  }, [roomId]);

  useEffect(() => {
    fetchQuestions();

    const channel = supabase
      .channel(`room-qa-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_questions", filter: `room_id=eq.${roomId}` }, () => fetchQuestions())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_answers" }, () => fetchQuestions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchQuestions]);

  const postQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim()) return;
    const { error } = await supabase.from("room_questions").insert({
      room_id: roomId,
      user_id: user.id,
      question: newQ.trim(),
    });
    if (error) {
      toast.error("Failed to post question");
      return;
    }
    setNewQ("");
  };

  const postAnswer = async (questionId: string) => {
    const text = answerInputs[questionId]?.trim();
    if (!text) return;
    const { error } = await supabase.from("room_answers").insert({
      question_id: questionId,
      user_id: user.id,
      answer: text,
    });
    if (error) {
      toast.error("Failed to post answer");
      return;
    }
    setAnswerInputs((prev) => ({ ...prev, [questionId]: "" }));
  };

  const askAI = async (questionId: string, questionText: string) => {
    setAiLoading(questionId);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-librarian`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Answer this study question clearly and concisely:\n\n${questionText}` }],
          }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Rate limited. Try again shortly."); return; }
        if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
        throw new Error("AI request failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      if (fullText) {
        await supabase.from("room_answers").insert({
          question_id: questionId,
          user_id: user.id,
          answer: fullText,
          is_ai: true,
        });
      } else {
        toast.error("AI returned empty response");
      }
    } catch (err: any) {
      toast.error("AI failed. Try again.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT }}>
      <form onSubmit={postQuestion} className="flex items-center gap-2 border-b border-secondary px-4 py-3">
        <input
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!newQ.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {questions.length === 0 && (
          <p className="pt-12 text-center text-sm text-muted-foreground">
            No questions yet. Ask something! 🤔
          </p>
        )}
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-secondary bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary">{q.profiles?.username || "User"}</p>
                  <p className="mt-1 text-sm font-medium text-warm-brown">{q.question}</p>
                </div>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-muted-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                  {q.room_answers?.length > 0 && (
                    <span className="text-xs font-semibold">{q.room_answers.length}</span>
                  )}
                </button>
              </div>

              {expandedQ === q.id && (
                <div className="mt-3 border-t border-secondary pt-3">
                  {q.room_answers?.map((a: any) => (
                    <div key={a.id} className={`mb-2 rounded-lg p-3 text-sm ${
                      a.is_ai ? "bg-primary/5 border border-primary/20" : "bg-secondary"
                    }`}>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        {a.is_ai ? "🤖 AI Answer" : a.profiles?.username || "User"}
                      </p>
                      <p className="whitespace-pre-wrap text-warm-brown">{a.answer}</p>
                    </div>
                  ))}

                  <div className="mt-2 flex gap-2">
                    <input
                      value={answerInputs[q.id] || ""}
                      onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write an answer…"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      onKeyDown={(e) => e.key === "Enter" && postAnswer(q.id)}
                    />
                    <button
                      onClick={() => postAnswer(q.id)}
                      disabled={!answerInputs[q.id]?.trim()}
                      className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => askAI(q.id, q.question)}
                      disabled={aiLoading === q.id}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all disabled:opacity-50"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      {aiLoading === q.id ? "Thinking…" : "Ask AI"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomQA;
