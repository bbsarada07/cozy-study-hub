import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Loader2, ChevronRight, ChevronLeft, Check, X } from "lucide-react";

interface Question {
  id: number;
  type: "mcq" | "oneword" | "short" | "long";
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

interface TestYourselfProps {
  roomId: string;
  user: User;
  isUnlocked: (id: string) => boolean;
  onAwardPoints: (amount: number, reason: string, roomId?: string) => void;
}

const EXAM_TYPES = ["NEET", "JEE", "School Exam", "Custom"];
const Q_TYPES = [
  { id: "mcq", label: "MCQ" },
  { id: "oneword", label: "One-word" },
  { id: "short", label: "Short Answer" },
  { id: "long", label: "Long Answer" },
];

const TestYourself = ({ roomId, user, isUnlocked, onAwardPoints }: TestYourselfProps) => {
  const [step, setStep] = useState<"setup" | "taking" | "results">("setup");
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("Custom");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq", "oneword", "short", "long"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState(0);

  // Blurting mode
  const hasBlurting = isUnlocked("blurting_method");
  const [blurtMode, setBlurtMode] = useState(false);
  const [blurtText, setBlurtText] = useState("");
  const [blurtFeedback, setBlurtFeedback] = useState("");
  const [blurtLoading, setBlurtLoading] = useState(false);

  const hasAdvancedFilters = isUnlocked("advanced_quiz_filters");
  const [difficulty, setDifficulty] = useState("medium");
  const [subtopic, setSubtopic] = useState("");

  const toggleQType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const generateQuestions = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    if (selectedTypes.length === 0) { toast.error("Select at least one question type"); return; }

    setGenerating(true);
    try {
      let prompt = `You are an exam question generator. Create exactly ${questionCount} questions about "${topic}".
Exam type: ${examType}
Question types: ${selectedTypes.join(", ")}`;

      if (hasAdvancedFilters) {
        prompt += `\nDifficulty: ${difficulty}`;
        if (subtopic.trim()) prompt += `\nSubtopic focus: ${subtopic}`;
      }

      prompt += `\n\nReturn ONLY a valid JSON array. Each object must have:
{"id": number, "type": "mcq"|"oneword"|"short"|"long", "question": string, "options": ["A","B","C","D"] (only for mcq), "answer": string, "explanation": string}

Generate real, specific, exam-quality questions about the topic. NOT generic questions about the exam type itself.`;

      const { data, error } = await supabase.functions.invoke("generate-test", {
        body: { messages: [{ role: "user", content: prompt }] },
      });

      if (error) throw error;

      let parsed: Question[];
      const text = typeof data === "string" ? data : data?.text || data?.content || JSON.stringify(data);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse questions from AI response");
      }

      setQuestions(parsed);
      setStep("taking");
      setCurrentQ(0);
      setAnswers({});
      setSubmitted({});
      setScore(0);
    } catch (e: any) {
      console.error("Generate error:", e);
      toast.error("Failed to generate questions. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const submitAnswer = (qId: number) => {
    const q = questions.find((x) => x.id === qId);
    if (!q || submitted[qId]) return;

    const userAnswer = (answers[qId] || "").trim().toLowerCase();
    const correctAnswer = q.answer.trim().toLowerCase();
    const isCorrect = q.type === "mcq"
      ? userAnswer === correctAnswer
      : correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer);

    setSubmitted((prev) => ({ ...prev, [qId]: true }));
    if (isCorrect) {
      setScore((s) => s + 1);
      onAwardPoints(2, "Correct answer in test", roomId);
    }
  };

  const finishTest = async () => {
    const bonus = Object.keys(submitted).length === questions.length ? 20 : 0;
    if (bonus > 0) {
      onAwardPoints(bonus, "Completed full test", roomId);
    }

    // Save test set
    await supabase.from("test_sets").insert({
      room_id: roomId,
      created_by: user.id,
      topic,
      exam_type: examType,
      questions: questions as any,
      total_points_awarded: score * 2 + bonus,
    });

    setStep("results");
  };

  const handleBlurt = async () => {
    if (!blurtText.trim()) return;
    const q = questions[currentQ];
    setBlurtLoading(true);
    try {
      const { data } = await supabase.functions.invoke("generate-test", {
        body: {
          messages: [{
            role: "user",
            content: `The question was: "${q.question}"
The correct answer is: "${q.answer}"
The student wrote from memory: "${blurtText}"

Compare what the student wrote with the correct answer. List what they got right and what they missed. Be concise and helpful.`,
          }],
        },
      });
      setBlurtFeedback(typeof data === "string" ? data : data?.text || data?.content || "Could not get feedback.");
    } catch {
      toast.error("Failed to check blurt");
    } finally {
      setBlurtLoading(false);
    }
  };

  const resetTest = () => {
    setStep("setup");
    setQuestions([]);
    setAnswers({});
    setSubmitted({});
    setScore(0);
    setBlurtMode(false);
    setBlurtText("");
    setBlurtFeedback("");
  };

  // SETUP STEP
  if (step === "setup") {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <h2 className="mb-4 text-lg font-bold text-foreground">📝 Test Yourself</h2>

        <label className="mb-1 text-sm font-medium text-muted-foreground">Topic</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Photosynthesis, Newton's Laws..."
          className="mb-4"
        />

        <label className="mb-1 text-sm font-medium text-muted-foreground">Exam Type</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {EXAM_TYPES.map((et) => (
            <button
              key={et}
              onClick={() => setExamType(et)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                examType === et
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {et}
            </button>
          ))}
        </div>

        <label className="mb-1 text-sm font-medium text-muted-foreground">Question Types</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {Q_TYPES.map((qt) => (
            <button
              key={qt.id}
              onClick={() => toggleQType(qt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedTypes.includes(qt.id)
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {qt.label}
            </button>
          ))}
        </div>

        {hasAdvancedFilters && (
          <div className="mb-4 space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
            <p className="text-xs font-semibold text-accent-foreground">🔍 Advanced Filters</p>
            <Input
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="Subtopic (e.g. Thermodynamics)"
              className="text-sm"
            />
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${
                    difficulty === d
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mb-1 text-sm font-medium text-muted-foreground">
          Number of Questions: {questionCount}
        </label>
        <input
          type="range"
          min={5}
          max={50}
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="mb-6 w-full accent-primary"
        />

        <Button onClick={generateQuestions} disabled={generating} className="w-full gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {generating ? "Generating…" : "Generate Questions"}
        </Button>
      </div>
    );
  }

  // TAKING STEP
  if (step === "taking") {
    const q = questions[currentQ];
    const isSubmitted = submitted[q?.id];

    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentQ + 1} of {questions.length}
          </span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent-foreground">
            Score: {score}/{Object.keys(submitted).length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-1.5 w-full rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="mb-2 rounded-lg border border-border bg-card p-4">
          <span className="mb-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
            {q.type}
          </span>
          <p className="text-sm font-medium text-foreground">{q.question}</p>
        </div>

        {/* Answer area */}
        {q.type === "mcq" && q.options ? (
          <div className="mb-4 space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === opt;
              const correct = isSubmitted && opt.toLowerCase() === q.answer.toLowerCase();
              const wrong = isSubmitted && selected && !correct;

              return (
                <button
                  key={i}
                  onClick={() => !isSubmitted && setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  disabled={!!isSubmitted}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-all ${
                    correct
                      ? "border-green-500 bg-green-50 text-green-800"
                      : wrong
                      ? "border-red-500 bg-red-50 text-red-800"
                      : selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {opt}
                  {correct && <Check className="float-right h-4 w-4" />}
                  {wrong && <X className="float-right h-4 w-4" />}
                </button>
              );
            })}
          </div>
        ) : (
          <Textarea
            value={answers[q.id] || ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder={q.type === "oneword" ? "Your answer (one word)…" : "Write your answer…"}
            rows={q.type === "long" ? 6 : q.type === "short" ? 3 : 1}
            disabled={!!isSubmitted}
            className="mb-4"
          />
        )}

        {!isSubmitted ? (
          <Button onClick={() => submitAnswer(q.id)} disabled={!answers[q.id]?.trim()} className="mb-3">
            Submit Answer
          </Button>
        ) : (
          <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
            <p className="text-xs font-semibold text-accent-foreground">Correct Answer:</p>
            <p className="text-sm text-foreground">{q.answer}</p>
            {q.explanation && (
              <p className="mt-1 text-xs text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        )}

        {/* Blurting Mode */}
        {hasBlurting && isSubmitted && (
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <button
              onClick={() => { setBlurtMode(!blurtMode); setBlurtText(""); setBlurtFeedback(""); }}
              className="text-xs font-semibold text-primary"
            >
              🧠 {blurtMode ? "Close" : "Try"} Blurting Method
            </button>
            {blurtMode && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={blurtText}
                  onChange={(e) => setBlurtText(e.target.value)}
                  placeholder="Write everything you remember about this topic..."
                  rows={4}
                />
                <Button size="sm" onClick={handleBlurt} disabled={blurtLoading || !blurtText.trim()}>
                  {blurtLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check with AI"}
                </Button>
                {blurtFeedback && (
                  <div className="rounded-lg bg-card p-3 text-xs text-foreground whitespace-pre-wrap">
                    {blurtFeedback}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQ((c) => c - 1)}
            disabled={currentQ === 0}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>

          {currentQ === questions.length - 1 ? (
            <Button size="sm" onClick={finishTest}>
              Finish Test
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQ((c) => c + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // RESULTS STEP
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-xl font-bold text-foreground mb-2">Test Complete!</h2>
      <p className="text-muted-foreground mb-1">
        You scored <strong className="text-foreground">{score}</strong> out of{" "}
        <strong className="text-foreground">{questions.length}</strong>
      </p>
      <p className="text-sm text-accent-foreground font-semibold mb-6">
        +{score * 2 + (Object.keys(submitted).length === questions.length ? 20 : 0)} points earned
      </p>
      <Button onClick={resetTest}>Take Another Test</Button>
    </div>
  );
};

export default TestYourself;
