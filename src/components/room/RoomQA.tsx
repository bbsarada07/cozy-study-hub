import { useState, useEffect } from "react";
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
  const [answerInput, setAnswerInput] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("room_questions")
      .select("*, profiles:user_id(username), room_answers(*, profiles:user_id(username))")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setQuestions(data || []);
  };

  useEffect(() => { fetchQuestions(); }, [roomId]);

  const postQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim()) return;
    await supabase.from("room_questions").insert({
      room_id: roomId,
      user_id: user.id,
      question: newQ.trim(),
    });
    setNewQ("");
    fetchQuestions();
  };

  const postAnswer = async (questionId: string) => {
    if (!answerInput.trim()) return;
    await supabase.from("room_answers").insert({
      question_id: questionId,
      user_id: user.id,
      answer: answerInput.trim(),
    });
    setAnswerInput("");
    fetchQuestions();
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
            messages: [{ role: "user", content: questionText }],
          }),
        }
      );

      if (!resp.ok) throw new Error("AI request failed");

      // Read full response (non-streaming for simplicity in Q&A)
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
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
        fetchQuestions();
      }
    } catch (err: any) {
      toast.error("AI failed. Try again.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT }}>
      {/* Ask question */}
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

      {/* Questions list */}
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
                <div>
                  <p className="text-xs font-semibold text-primary">{q.profiles?.username || "User"}</p>
                  <p className="mt-1 text-sm font-medium text-warm-brown">{q.question}</p>
                </div>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  className="rounded-full bg-secondary p-1.5 text-muted-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                  {q.room_answers?.length > 0 && (
                    <span className="ml-1 text-xs">{q.room_answers.length}</span>
                  )}
                </button>
              </div>

              {expandedQ === q.id && (
                <div className="mt-3 border-t border-secondary pt-3">
                  {/* Answers */}
                  {q.room_answers?.map((a: any) => (
                    <div key={a.id} className={`mb-2 rounded-lg p-3 text-sm ${
                      a.is_ai ? "bg-primary/5 border border-primary/20" : "bg-secondary"
                    }`}>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        {a.is_ai ? "🤖 AI Answer" : a.profiles?.username || "User"}
                      </p>
                      <p className="text-warm-brown">{a.answer}</p>
                    </div>
                  ))}

                  {/* Answer input + AI button */}
                  <div className="mt-2 flex gap-2">
                    <input
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Write an answer…"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      onKeyDown={(e) => e.key === "Enter" && postAnswer(q.id)}
                    />
                    <button
                      onClick={() => askAI(q.id, q.question)}
                      disabled={aiLoading === q.id}
                      className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-all disabled:opacity-50"
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
