import { useState } from "react";
import { Bot, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";

interface Props {
  roomId: string;
  user: User;
}

type QuizQuestion = {
  question: string;
  type: "mcq" | "one_word" | "short" | "long";
  options?: string[];
  answer: string;
  subject?: string;
};

const EXAM_TYPES = [
  { id: "neet", label: "NEET (Medical)", subjects: "Biology, Physics, Chemistry" },
  { id: "jee", label: "JEE (Engineering)", subjects: "Physics, Chemistry, Maths" },
  { id: "school", label: "School Exam", subjects: "" },
  { id: "custom", label: "Custom", subjects: "" },
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
  const [shortInput, setShortInput] = useState("");

  const getQuizPrompt = (topicText: string, exam: string) => {
    const examInfo = EXAM_TYPES.find(e => e.id === exam);
    const subjectLine = examInfo?.subjects ? `Cover these subjects: ${examInfo.subjects}.` : "";

    if (exam === "jee" || exam === "neet") {
      return `You are an expert exam paper setter for ${examInfo?.label || exam}.
Create a realistic mock test based on this topic/content: "${topicText}"

${subjectLine}

Generate exactly 10 questions with this distribution:
- 5 MCQ questions (4 options each, only one correct)
- 2 one-word answer questions  
- 2 short answer questions (1-2 sentence answers)
- 1 long answer question (detailed answer)

CRITICAL RULES:
- Questions MUST be about the specific content/topic provided
- Questions should be at ${examInfo?.label} difficulty level
- Each question must include a "subject" field (e.g., "Physics", "Chemistry", etc.)
- DO NOT generate generic questions about what ${examInfo?.label} is
- Generate actual exam-style questions testing knowledge of the topic

Return ONLY a JSON array. Each object must have:
- "question": string
- "type": "mcq" | "one_word" | "short" | "long"
- "options": string[] (only for mcq, exactly 4 options)
- "answer": string (correct answer)
- "subject": string

Return ONLY the raw JSON array, no markdown, no explanation.`;
    }

    return `You are a quiz generator for students.
Create a quiz based on this topic/content: "${topicText}"

Generate exactly 8 questions with this distribution:
- 4 MCQ questions (4 options each, only one correct)
- 2 one-word answer questions
- 1 short answer question
- 1 long answer question

CRITICAL: Questions must test actual knowledge of the provided topic/content. Do NOT ask generic or meta questions.

Return ONLY a JSON array. Each object must have:
- "question": string
- "type": "mcq" | "one_word" | "short" | "long"
- "options": string[] (only for mcq, exactly 4 options)
- "answer": string (correct answer)

Return ONLY the raw JSON array, no markdown, no explanation.`;
  };

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const prompt = getQuizPrompt(topic.trim(), examType);

      const { data, error } = await supabase.functions.invoke("ask-librarian", {
        body: { messages: [{ role: "user", content: prompt }] },
      });

      if (error) throw error;

      // Handle streaming response - the edge function returns SSE
      let fullText = "";
      if (typeof data === "string") {
        // Parse SSE text
        for (const line of data.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      } else if (data?.choices) {
        fullText = data.choices[0]?.message?.content || "";
      } else {
        // Try reading as stream via fetch instead
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-librarian`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
          }
        );
        if (!resp.ok) throw new Error("Failed to generate quiz");

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
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
      }

      if (!fullText) throw new Error("Empty AI response");

      // Extract JSON array from response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid quiz format");

      const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);
      setQuiz(questions);
      setCurrentQ(0);
      setScore(0);
      setSelectedAnswer(null);
      setShortInput("");
      setShowResult(false);
    } catch (err: any) {
      console.error("Quiz generation error:", err);
      toast.error("Failed to generate quiz. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const checkAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    const correct = quiz[currentQ].answer.toLowerCase().trim();
    if (answer.toLowerCase().trim() === correct) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShortInput("");
    setShowResult(false);
    setCurrentQ((c) => c + 1);
  };

  const isFinished = currentQ >= quiz.length && quiz.length > 0;
  const currentQuestion = quiz[currentQ];

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4" style={{ fontFamily: FONT }}>
      {quiz.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Sparkles className="h-12 w-12 text-primary" />
          <h2 className="text-lg font-bold text-warm-brown">AI Quiz Generator</h2>
          <p className="text-center text-sm text-muted-foreground">
            Enter a topic or paste study material to generate exam-style questions
          </p>

          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Paste your study notes, a topic like 'Photosynthesis', or chapter content here..."
            rows={4}
            className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
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
            {generating ? "Generating Quiz…" : "Generate Quiz"}
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
              {currentQuestion?.subject && ` · ${currentQuestion.subject}`}
            </span>
            <span className="text-sm font-bold text-primary">Score: {score}</span>
          </div>

          <div className="rounded-xl border border-secondary bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                currentQuestion?.type === "mcq" ? "bg-primary/10 text-primary" :
                currentQuestion?.type === "one_word" ? "bg-accent/20 text-accent-foreground" :
                currentQuestion?.type === "short" ? "bg-secondary text-muted-foreground" :
                "bg-destructive/10 text-destructive"
              }`}>
                {currentQuestion?.type === "one_word" ? "One Word" : currentQuestion?.type?.toUpperCase()}
              </span>
            </div>
            <p className="text-base font-semibold text-warm-brown">{currentQuestion?.question}</p>
          </div>

          {currentQuestion?.type === "mcq" && currentQuestion.options ? (
            <div className="flex flex-col gap-2">
              {currentQuestion.options.map((opt, i) => {
                const isCorrect = opt.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
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
                    {showResult && isCorrect && <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {currentQuestion?.type === "long" ? (
                <textarea
                  value={shortInput}
                  onChange={(e) => !showResult && setShortInput(e.target.value)}
                  placeholder="Type your detailed answer…"
                  rows={4}
                  disabled={showResult}
                  className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              ) : (
                <input
                  value={shortInput}
                  onChange={(e) => !showResult && setShortInput(e.target.value)}
                  placeholder={currentQuestion?.type === "one_word" ? "One word answer…" : "Type your answer…"}
                  disabled={showResult}
                  className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && shortInput && !showResult && checkAnswer(shortInput)}
                />
              )}
              {!showResult && (
                <button
                  onClick={() => shortInput && checkAnswer(shortInput)}
                  disabled={!shortInput}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Check Answer
                </button>
              )}
              {showResult && (
                <div className="rounded-xl border border-secondary bg-secondary/50 p-3 text-sm">
                  <p className="font-semibold text-muted-foreground">Correct answer:</p>
                  <p className="text-warm-brown">{currentQuestion?.answer}</p>
                </div>
              )}
            </div>
          )}

          {showResult && (
            <button
              onClick={nextQuestion}
              className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg"
            >
              {currentQ === quiz.length - 1 ? "See Results" : "Next Question →"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomQuiz;
