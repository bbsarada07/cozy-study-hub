import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Camera, Image, Save, CheckSquare, Square, Sparkles } from "lucide-react";

import libraryBg from "@/assets/library-room.png";

const FONT = "'Times New Roman', Times, serif";
const HANDWRITING_FONT = "'Segoe Script', 'Comic Sans MS', 'Brush Script MT', cursive";

interface Task {
  id: number;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
}

const previousEntries = [
  { id: 1, text: "Need to study calculus before Thursday exam...", date: "Mar 26" },
  { id: 2, text: "Don't forget project deadline next Monday", date: "Mar 25" },
  { id: 3, text: "Research paper outline due Friday", date: "Mar 24" },
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

    // AI-like task extraction and prioritization
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

    // Sort by priority
    const order = { high: 0, medium: 1, low: 2 };
    prioritized.sort((a, b) => order[a.priority] - order[b.priority]);

    setTasks(prioritized);
    setShowTasks(true);
  };

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "hsl(0, 70%, 55%)";
    if (p === "medium") return "hsl(36, 70%, 50%)";
    return "hsl(120, 30%, 45%)";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "Urgent";
    if (p === "medium") return "Important";
    return "Later";
  };

  // Generate lined-paper background
  const linedBg = `repeating-linear-gradient(
    transparent,
    transparent 31px,
    hsla(25, 20%, 70%, 0.3) 31px,
    hsla(25, 20%, 70%, 0.3) 32px
  )`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <img src={libraryBg} alt="Library" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ backdropFilter: "blur(14px)", backgroundColor: "hsla(35, 30%, 85%, 0.6)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center justify-center rounded-full p-2 transition-all"
            style={{ backgroundColor: "hsla(36, 70%, 50%, 0.85)" }}
          >
            <ArrowLeft className="h-5 w-5 text-primary-foreground" />
          </button>
          <h1
            className="text-2xl font-bold text-warm-brown"
            style={{ fontFamily: FONT }}
          >
            Brain Dump
          </h1>
        </header>

        {/* Notebook */}
        <div className="flex-1 px-4 pb-4">
          <div
            className="mx-auto w-full max-w-lg rounded-2xl p-1 shadow-2xl"
            style={{
              backgroundColor: "hsla(40, 30%, 96%, 0.95)",
              border: "1px solid hsla(25, 20%, 80%, 0.5)",
            }}
          >
            {/* Notebook header strip */}
            <div
              className="mb-0 rounded-t-xl px-4 py-3"
              style={{ backgroundColor: "hsla(36, 70%, 50%, 0.15)" }}
            >
              <p
                className="text-sm font-semibold text-warm-brown"
                style={{ fontFamily: FONT }}
              >
                📝 My Notebook
              </p>
            </div>

            {/* Lined paper area */}
            <div
              className="relative min-h-[280px] px-6 py-4"
              style={{ background: linedBg }}
            >
              {/* Red margin line */}
              <div
                className="absolute left-10 top-0 h-full w-px"
                style={{ backgroundColor: "hsla(0, 50%, 60%, 0.3)" }}
              />

              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write what's on your mind..."
                className="w-full resize-none border-none bg-transparent pl-4 text-base leading-8 text-foreground outline-none placeholder:text-muted-foreground"
                style={{
                  fontFamily: HANDWRITING_FONT,
                  minHeight: "240px",
                  lineHeight: "32px",
                  color: "hsl(25, 50%, 22%)",
                }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 border-t border-secondary px-4 py-4">
              <button
                onClick={handleVoiceInput}
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: isRecording ? "hsl(0, 70%, 55%)" : "hsla(36, 70%, 50%, 0.9)",
                }}
                title="Voice Input"
              >
                <Mic className="h-5 w-5 text-primary-foreground" />
              </button>
              <button
                onClick={handleImageCapture}
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: "hsla(36, 70%, 50%, 0.9)" }}
                title="Camera / OCR"
              >
                <Camera className="h-5 w-5 text-primary-foreground" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: "hsla(36, 70%, 50%, 0.9)" }}
                title="Attach Image"
              >
                <Image className="h-5 w-5 text-primary-foreground" />
              </button>
              <button
                onClick={handleSave}
                className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: "hsla(120, 35%, 45%, 0.9)" }}
                title="Save & Prioritize"
              >
                <Save className="h-5 w-5 text-primary-foreground" />
              </button>

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
              className="mx-auto mt-5 w-full max-w-lg rounded-2xl p-5 shadow-xl"
              style={{
                backgroundColor: "hsla(40, 30%, 96%, 0.95)",
                border: "1px solid hsla(25, 20%, 80%, 0.5)",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: "hsl(36, 70%, 50%)" }} />
                <h2
                  className="text-lg font-bold text-warm-brown"
                  style={{ fontFamily: FONT }}
                >
                  AI-Prioritized Tasks
                </h2>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-all hover:bg-secondary/50"
                  >
                    {task.done ? (
                      <CheckSquare className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "hsl(120, 35%, 45%)" }} />
                    ) : (
                      <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`flex-1 text-sm ${task.done ? "line-through opacity-50" : ""}`}
                      style={{ fontFamily: FONT, color: "hsl(25, 50%, 22%)" }}
                    >
                      {task.text}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                      style={{ backgroundColor: priorityColor(task.priority) }}
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
            className="mx-auto mt-5 w-full max-w-lg rounded-2xl p-5 shadow-xl"
            style={{
              backgroundColor: "hsla(40, 30%, 96%, 0.95)",
              border: "1px solid hsla(25, 20%, 80%, 0.5)",
            }}
          >
            <h2
              className="mb-3 text-lg font-bold text-warm-brown"
              style={{ fontFamily: FONT }}
            >
              Previous Thoughts
            </h2>
            <div className="space-y-2">
              {previousEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl px-4 py-3 shadow-sm"
                  style={{
                    backgroundColor: "hsla(40, 30%, 98%, 0.9)",
                    border: "1px solid hsla(25, 20%, 85%, 0.4)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: HANDWRITING_FONT, color: "hsl(25, 50%, 22%)" }}
                  >
                    {entry.text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" style={{ fontFamily: FONT }}>
                    {entry.date}
                  </p>
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
