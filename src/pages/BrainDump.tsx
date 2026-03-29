import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Camera, Image, Save, CheckSquare, Square, Sparkles, BookOpen, PenLine } from "lucide-react";

import braindumpBg from "@/assets/braindump-bg.png";

const FONT = "'Times New Roman', Times, serif";
const HANDWRITING_FONT = "'Segoe Script', 'Comic Sans MS', 'Brush Script MT', cursive";

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
}

const previousEntries = [
  { id: 1, text: "Need to study calculus before Thursday exam...", date: "Mar 26", icon: "📐" },
  { id: 2, text: "Don't forget project deadline next Monday", date: "Mar 25", icon: "📋" },
  { id: 3, text: "Research paper outline due Friday", date: "Mar 24", icon: "📝" },
];

const BrainDump = () => {
  const navigate = useNavigate();
  const [noteText, setNoteText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNoteText((prev) => prev + (prev ? "\n" : "") + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  const handleImageCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNoteText((prev) => prev + (prev ? "\n" : "") + `[📷 Image attached: ${file.name}]`);
    }
  };

  const handleSave = () => {
    if (!noteText.trim()) return;
    const lines = noteText.split("\n").filter((l) => l.trim());
    const prioritized: Task[] = lines.map((line, i) => {
      let priority: "high" | "medium" | "low" = "low";
      const lower = line.toLowerCase();
      if (lower.includes("deadline") || lower.includes("urgent") || lower.includes("exam") || lower.includes("due")) {
        priority = "high";
      } else if (lower.includes("project") || lower.includes("submit") || lower.includes("important") || lower.includes("study")) {
        priority = "medium";
      }
      return { id: i + 1, text: line.replace(/^\[.*?\]\s*/, ""), done: false, priority };
    });
    const order = { high: 0, medium: 1, low: 2 };
    prioritized.sort((a, b) => order[a.priority] - order[b.priority]);
    setTasks(prioritized);
    setShowTasks(true);
  };

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "hsl(0, 55%, 45%)";
    if (p === "medium") return "hsl(30, 70%, 45%)";
    return "hsl(140, 30%, 40%)";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "Urgent";
    if (p === "medium") return "Important";
    return "Later";
  };

  const linedBg = `repeating-linear-gradient(
    transparent,
    transparent 31px,
    hsla(25, 15%, 50%, 0.15) 31px,
    hsla(25, 15%, 50%, 0.15) 32px
  )`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dark blurred background */}
      <img
        src={braindumpBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "blur(18px) brightness(0.35)" }}
      />
      {/* Dark warm overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "hsla(25, 20%, 10%, 0.55)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center justify-center rounded-full p-2 transition-all hover:scale-105"
            style={{
              backgroundColor: "hsla(30, 50%, 30%, 0.7)",
              backdropFilter: "blur(10px)",
              border: "1px solid hsla(30, 40%, 50%, 0.3)",
            }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "hsl(35, 60%, 75%)" }} />
          </button>
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5" style={{ color: "hsl(35, 60%, 65%)" }} />
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: FONT, color: "hsl(30, 50%, 70%)" }}
            >
              Brain Dump
            </h1>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 px-4 pb-6">
          {/* Notebook Card */}
          <div
            className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{
              backgroundColor: "hsla(35, 20%, 95%, 0.92)",
              border: "1px solid hsla(25, 20%, 70%, 0.25)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px -15px hsla(25, 30%, 10%, 0.5), 0 0 0 1px hsla(30, 40%, 80%, 0.1)",
            }}
          >
            {/* Notebook header */}
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{
                background: "linear-gradient(135deg, hsla(25, 40%, 25%, 0.9), hsla(30, 35%, 30%, 0.9))",
                borderBottom: "1px solid hsla(30, 40%, 50%, 0.2)",
              }}
            >
              <BookOpen className="h-4 w-4" style={{ color: "hsl(35, 60%, 70%)" }} />
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: FONT, color: "hsl(35, 50%, 75%)" }}
              >
                My Notebook
              </p>
              <div className="ml-auto flex gap-1">
                {["Work", "Notes", "To-Do"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: "hsla(35, 40%, 60%, 0.2)",
                      color: "hsl(35, 50%, 70%)",
                      border: "1px solid hsla(35, 40%, 60%, 0.2)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Lined paper area */}
            <div
              className="relative min-h-[260px] px-6 py-4"
              style={{ background: linedBg }}
            >
              {/* Red margin line */}
              <div
                className="absolute left-10 top-0 h-full w-px"
                style={{ backgroundColor: "hsla(0, 40%, 55%, 0.2)" }}
              />

              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write what's on your mind..."
                className="w-full resize-none border-none bg-transparent pl-4 text-base outline-none"
                style={{
                  fontFamily: HANDWRITING_FONT,
                  minHeight: "230px",
                  lineHeight: "32px",
                  color: "hsl(20, 45%, 18%)",
                  caretColor: "hsl(25, 50%, 35%)",
                }}
              	/>
              {/* Subtle pen icon */}
              {!noteText && (
                <div className="pointer-events-none absolute bottom-6 right-6 opacity-10">
                  <PenLine className="h-16 w-16" style={{ color: "hsl(25, 40%, 30%)" }} />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div
              className="flex items-center justify-center gap-4 px-4 py-4"
              style={{
                background: "linear-gradient(0deg, hsla(35, 15%, 90%, 1), hsla(35, 15%, 93%, 1))",
                borderTop: "1px solid hsla(25, 20%, 80%, 0.3)",
              }}
            >
              {[
                { icon: Mic, action: handleVoiceInput, active: isRecording, color: isRecording ? "hsl(0, 55%, 50%)" : "hsl(25, 35%, 35%)", label: "Voice" },
                { icon: Camera, action: handleImageCapture, color: "hsl(25, 35%, 35%)", label: "Camera" },
                { icon: Image, action: () => fileInputRef.current?.click(), color: "hsl(25, 35%, 35%)", label: "Image" },
                { icon: Save, action: handleSave, color: "hsl(140, 30%, 35%)", label: "Save" },
              ].map(({ icon: Icon, action, active, color, label }) => (
                <button
                  key={label}
                  onClick={action}
                  className="group flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all"
                    style={{
                      backgroundColor: active ? "hsl(0, 55%, 50%)" : (color || "hsl(25, 35%, 35%)"),
                      boxShadow: `0 4px 15px -3px ${active ? "hsla(0, 55%, 50%, 0.4)" : "hsla(25, 30%, 20%, 0.3)"}`,
                    }}
                  >
                    <Icon className="h-4.5 w-4.5"	 style={{ color: "hsl(40, 30%, 92%)" }} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(25, 30%, 45%)", fontFamily: FONT }}>
                    {label}
                  </span>
                </button>
              ))}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
          </div>

          {/* AI-Prioritized Tasks */}
          {showTasks && tasks.length > 0 && (
            <div
              className="mx-auto mt-5 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
              style={{
                backgroundColor: "hsla(25, 15%, 12%, 0.85)",
                border: "1px solid hsla(30, 40%, 50%, 0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid hsla(30, 40%, 50%, 0.1)" }}
              >
                <Sparkles className="h-4 w-4" style={{ color: "hsl(35, 70%, 55%)" }} />
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: FONT, color: "hsl(30, 50%, 70%)" }}
                >
                  AI-Prioritized Tasks
                </h2>
              </div>

              <div className="space-y-1 p-3">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{
                      backgroundColor: task.done ? "hsla(140, 20%, 20%, 0.3)" : "hsla(30, 20%, 20%, 0.3)",
                    }}
                  >
                    {task.done ? (
                      <CheckSquare className="h-4 w-4 shrink-0" style={{ color: "hsl(140, 40%, 50%)" }} />
                    ) : (
                      <Square className="h-4 w-4 shrink-0" style={{ color: "hsl(30, 30%, 50%)" }} />
                    )}
                    <span
                      className={`flex-1 text-sm ${task.done ? "line-through opacity-40" : ""}`}
                      style={{ fontFamily: FONT, color: "hsl(35, 40%, 75%)" }}
                    >
                      {task.text}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: `${priorityColor(task.priority)}22`,
                        color: priorityColor(task.priority),
                        border: `1px solid ${priorityColor(task.priority)}44`,
                      }}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Previous Entries */}
          <div
            className="mx-auto mt-5 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{
              backgroundColor: "hsla(25, 15%, 12%, 0.85)",
              border: "1px solid hsla(30, 40%, 50%, 0.15)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid hsla(30, 40%, 50%, 0.1)" }}
            >
              <BookOpen className="h-4 w-4" style={{ color: "hsl(35, 60%, 60%)" }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: FONT, color: "hsl(30, 50%, 70%)" }}
              >
                Previous Thoughts
              </h2>
            </div>
            <div className="space-y-2 p-3">
              {previousEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all hover:brightness-110"
                  style={{
                    backgroundColor: "hsla(30, 20%, 18%, 0.6)",
                    border: "1px solid hsla(30, 30%, 40%, 0.1)",
                  }}
                >
                  <span className="mt-0.5 text-lg">{entry.icon}</span>
                  <div className="flex-1">
                    <p
                      className="text-sm"
                      style={{ fontFamily: HANDWRITING_FONT, color: "hsl(35, 40%, 72%)" }}
                    >
                      {entry.text}
                    </p>
                    <p className="mt-1 text-[11px]" style={{ fontFamily: FONT, color: "hsl(30, 20%, 45%)" }}>
                      {entry.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrainDump;
