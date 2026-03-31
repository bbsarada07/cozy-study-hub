import { useState } from "react";
import { Bot, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";

interface Props {
  roomId: string;
  user: User;
}

type QuizQuestion = {
  question: string;
  type: "mcq" | "short";
  options?: string[];
  answer: string;
};

const EXAM_TYPES = [
  { id: "neet", label: "NEET (Medical)" },
  { id: "jee", label: "JEE (Engineering)" },
  { id: "school", label: "School Exam" },
  { id: "custom", label: "Custom" },
];

const RoomQuiz = ({ roomId, user }: Props) => {
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("school");
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const prompt = `Generate a quiz of exactly 5 questions about "${topic.trim()}" for ${examType} level. 
Return a JSON array of objects with fields: question (string), type ("mcq" or "short"), options (array of 4 strings for mcq, omit for short), answer (correct answer string).
ONLY return the JSON array, nothing else.`;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-librarian`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (!resp.ok) throw new Error("Failed to generate quiz");

      // Read full streamed response
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid quiz format");

      const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);
      setQuiz(questions);
      setCurrentQ(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowResult(false);
    } catch (err: any) {
      toast.error("Failed to generate quiz. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const checkAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    if (answer.toLowerCase().trim() === quiz[currentQ].answer.toLowerCase().trim()) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentQ((c) => c + 1);
  };

  const isFinished = currentQ >= quiz.length && quiz.length > 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4" style={{ fontFamily: FONT }}>
      {quiz.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Sparkles className="h-12 w-12 text-primary" />
          <h2 className="text-lg font-bold text-warm-brown">AI Quiz Generator</h2>
          <p className="text-center text-sm text-muted-foreground">
            Enter a topic and select exam type to generate a quiz
          </p>

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, Newton's Laws"
            className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          <div className="flex flex-wrap justify-center gap-2">
            {EXAM_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setExamType(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  examType === t.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={generateQuiz}
            disabled={!topic.trim() || generating}
            className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <Bot className="h-5 w-5" />
            {generating ? "Generating…" : "Generate Quiz"}
          </button>
        </div>
      ) : isFinished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold text-warm-brown">Quiz Complete! 🎉</h2>
          <p className="text-4xl font-bold text-primary">
            {score}/{quiz.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {score === quiz.length ? "Perfect score!" : score >= quiz.length / 2 ? "Good job!" : "Keep studying!"}
          </p>
          <button
            onClick={() => { setQuiz([]); setTopic(""); }}
            className="rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg"
          >
            New Quiz
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              Question {currentQ + 1}/{quiz.length}
            </span>
            <span className="text-sm font-bold text-primary">Score: {score}</span>
          </div>

          <div className="rounded-xl border border-secondary bg-card p-5 shadow-sm">
            <p className="text-base font-semibold text-warm-brown">{quiz[currentQ].question}</p>
          </div>

          {quiz[currentQ].type === "mcq" && quiz[currentQ].options ? (
            <div className="flex flex-col gap-2">
              {quiz[currentQ].options!.map((opt, i) => {
                const isCorrect = opt.toLowerCase().trim() === quiz[currentQ].answer.toLowerCase().trim();
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={i}
                    onClick={() => !showResult && checkAnswer(opt)}
                    disabled={showResult}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                      showResult
                        ? isCorrect
                          ? "border-green-500 bg-green-50 text-green-800"
                          : isSelected
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-secondary bg-card text-muted-foreground"
                        : "border-secondary bg-card text-warm-brown hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {showResult && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={selectedAnswer || ""}
                onChange={(e) => !showResult && setSelectedAnswer(e.target.value)}
                placeholder="Type your answer…"
                disabled={showResult}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && selectedAnswer && !showResult && checkAnswer(selectedAnswer)}
              />
              {!showResult && (
                <button
                  onClick={() => selectedAnswer && checkAnswer(selectedAnswer)}
                  disabled={!selectedAnswer}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Check
                </button>
              )}
            </div>
          )}

          {showResult && currentQ < quiz.length - 1 && (
            <button
              onClick={nextQuestion}
              className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg"
            >
              Next Question →
            </button>
          )}
          {showResult && currentQ === quiz.length - 1 && (
            <button
              onClick={nextQuestion}
              className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg"
            >
              See Results
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomQuiz;
