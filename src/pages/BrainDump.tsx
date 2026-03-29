import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Camera, Image, Save, CalendarDays, Bell, X } from "lucide-react";
import { format, addDays, isValid } from "date-fns";
import TaskBoard, { type BoardTask } from "@/components/TaskBoard";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import libraryBg from "@/assets/library-room.png";

const FONT = "'Times New Roman', Times, serif";
const HANDWRITING_FONT = "'Segoe Script', 'Comic Sans MS', 'Brush Script MT', cursive";

// Re-use BoardTask type from TaskBoard

interface SavedEvent {
  date: Date;
  title: string;
}

const previousEntries = [
  { id: 1, text: "Need to study calculus before Thursday exam...", date: "Mar 26" },
  { id: 2, text: "Don't forget project deadline next Monday", date: "Mar 25" },
  { id: 3, text: "Research paper outline due Friday", date: "Mar 24" },
];

// Date detection patterns
const DATE_PATTERNS = [
  { regex: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i, parse: (m: RegExpMatchArray) => {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, parseInt(m[1]) - 1, parseInt(m[2]));
  }},
  { regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?\b/i, parse: (m: RegExpMatchArray) => {
    const months: Record<string, number> = { january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11 };
    const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
    return new Date(year, months[m[1].toLowerCase()], parseInt(m[2]));
  }},
  { regex: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?\b/i, parse: (m: RegExpMatchArray) => {
    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
    return new Date(year, months[m[1].toLowerCase()], parseInt(m[2]));
  }},
  { regex: /\b(tomorrow)\b/i, parse: () => addDays(new Date(), 1) },
  { regex: /\b(day after tomorrow)\b/i, parse: () => addDays(new Date(), 2) },
  { regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, parse: (m: RegExpMatchArray) => {
    const days: Record<string, number> = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    const target = days[m[1].toLowerCase()];
    const today = new Date();
    const diff = (target - today.getDay() + 7) % 7 || 7;
    return addDays(today, diff);
  }},
  { regex: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, parse: (m: RegExpMatchArray) => {
    const days: Record<string, number> = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    const target = days[m[1].toLowerCase()];
    const today = new Date();
    let diff = (target - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return addDays(today, diff);
  }},
];

function detectDates(text: string): Date | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const date = pattern.parse(match);
      if (isValid(date)) return date;
    }
  }
  return undefined;
}

function suggestTime(priority: "high" | "medium" | "low"): string {
  if (priority === "high") return "Morning (8:00 AM – 10:00 AM)";
  if (priority === "medium") return "Afternoon (2:00 PM – 4:00 PM)";
  return "Evening (6:00 PM – 7:00 PM)";
}

function estimateDuration(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("exam") || lower.includes("test")) return "2–3 hours";
  if (lower.includes("project") || lower.includes("paper") || lower.includes("research")) return "3–4 hours";
  if (lower.includes("study") || lower.includes("review")) return "1–2 hours";
  if (lower.includes("read") || lower.includes("chapter")) return "45 min – 1 hour";
  return "30 min – 1 hour";
}

const BrainDump = () => {
  const navigate = useNavigate();
  const [noteText, setNoteText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<SavedEvent | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
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
    const detectedEvents: SavedEvent[] = [];
    const prioritized: BoardTask[] = lines.map((line, i) => {
      let priority: "high" | "medium" | "low" = "low";
      const lower = line.toLowerCase();
      if (lower.includes("deadline") || lower.includes("urgent") || lower.includes("exam") || lower.includes("due") || lower.includes("test")) {
        priority = "high";
      } else if (lower.includes("project") || lower.includes("submit") || lower.includes("important") || lower.includes("study") || lower.includes("review")) {
        priority = "medium";
      }

      const detectedDate = detectDates(line);
      if (detectedDate) {
        detectedEvents.push({ date: detectedDate, title: line.replace(/^\[.*?\]\s*/, "") });
      }

      return {
        id: i + 1,
        text: line.replace(/^\[.*?\]\s*/, ""),
        status: "todo" as const,
        priority,
        detectedDate,
        suggestedTime: suggestTime(priority),
        estimatedDuration: estimateDuration(line),
      };
    });

    const order = { high: 0, medium: 1, low: 2 };
    prioritized.sort((a, b) => order[a.priority] - order[b.priority]);

    setTasks(prioritized);
    // showTasks is derived from tasks.length > 0

    // Handle detected dates - show calendar
    if (detectedEvents.length > 0) {
      setPendingEvent(detectedEvents[0]);
      setShowCalendar(true);
      setSavedEvents((prev) => [...prev, ...detectedEvents]);

      // Schedule notification simulation for day before
      detectedEvents.forEach((ev) => {
        const dayBefore = addDays(ev.date, -1);
        const now = new Date();
        const msUntilNotify = dayBefore.getTime() - now.getTime();
        if (msUntilNotify > 0 && msUntilNotify < 86400000 * 7) {
          setTimeout(() => {
            setNotification(`📅 Reminder: "${ev.title}" is tomorrow (${format(ev.date, "MMM d")})`);
          }, Math.min(msUntilNotify, 5000)); // cap at 5s for demo
        } else {
          // Show immediate notification for demo
          setTimeout(() => {
            setNotification(`📅 Saved: "${ev.title}" on ${format(ev.date, "MMM d, yyyy")}. You'll be reminded a day before.`);
          }, 800);
        }
      });
    }
  };

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "hsl(0, 70%, 45%)";
    if (p === "medium") return "hsl(36, 70%, 42%)";
    return "hsl(120, 30%, 38%)";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "High";
    if (p === "medium") return "Medium";
    return "Low";
  };

  const eventDates = savedEvents.map((e) => e.date);

  const linedBg = `repeating-linear-gradient(
    transparent,
    transparent 35px,
    hsla(25, 20%, 70%, 0.3) 35px,
    hsla(25, 20%, 70%, 0.3) 36px
  )`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <img src={libraryBg} alt="Library" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ backdropFilter: "blur(14px)", backgroundColor: "hsla(35, 30%, 85%, 0.6)" }}
      />

      {/* Notification banner */}
      {notification && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3 shadow-lg"
          style={{ backgroundColor: "hsl(36, 70%, 50%)", color: "hsl(0, 0%, 100%)" }}>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span className="text-sm font-semibold" style={{ fontFamily: FONT }}>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
            className="text-2xl font-bold"
            style={{ fontFamily: FONT, color: "hsl(25, 50%, 15%)" }}
          >
            Brain Dump
          </h1>
        </header>

        {/* Notebook */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                className="text-sm font-bold"
                style={{ fontFamily: FONT, color: "hsl(25, 50%, 15%)" }}
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
                className="w-full resize-none border-none bg-transparent pl-4 outline-none placeholder:text-muted-foreground/70"
                style={{
                  fontFamily: HANDWRITING_FONT,
                  minHeight: "240px",
                  lineHeight: "36px",
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "hsl(25, 55%, 12%)",
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
                style={{ backgroundColor: "hsla(120, 35%, 40%, 0.95)" }}
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

          {/* Calendar popup for detected dates */}
          {showCalendar && pendingEvent && (
            <div
              className="mx-auto mt-4 w-full max-w-lg rounded-2xl p-4 shadow-xl"
              style={{
                backgroundColor: "hsla(40, 30%, 96%, 0.97)",
                border: "1px solid hsla(25, 20%, 80%, 0.5)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" style={{ color: "hsl(36, 70%, 42%)" }} />
                  <h2 className="text-base font-bold" style={{ fontFamily: FONT, color: "hsl(25, 50%, 12%)" }}>
                    📅 Date Detected & Saved
                  </h2>
                </div>
                <button onClick={() => setShowCalendar(false)} className="rounded-full p-1 hover:bg-secondary/50">
                  <X className="h-4 w-4" style={{ color: "hsl(25, 50%, 30%)" }} />
                </button>
              </div>
              <p className="mb-2 text-sm font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 50%, 20%)" }}>
                "{pendingEvent.title}" → {format(pendingEvent.date, "MMMM d, yyyy")}
              </p>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={pendingEvent.date}
                  modifiers={{ event: eventDates }}
                  modifiersStyles={{
                    event: { backgroundColor: "hsl(36, 70%, 50%)", color: "white", borderRadius: "50%" },
                  }}
                  className="pointer-events-auto rounded-xl"
                />
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "hsla(36, 70%, 50%, 0.1)" }}>
                <Bell className="h-4 w-4" style={{ color: "hsl(36, 70%, 42%)" }} />
                <span className="text-xs font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 50%, 20%)" }}>
                  🔔 You'll be notified on {format(addDays(pendingEvent.date, -1), "MMM d")} (1 day before)
                </span>
              </div>
            </div>
          )}

          {/* Kanban Task Board */}
          {showTasks && tasks.length > 0 && (
            <TaskBoard tasks={tasks} onUpdateTasks={setTasks} />
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
              className="mb-3 text-lg font-extrabold"
              style={{ fontFamily: FONT, color: "hsl(25, 50%, 12%)" }}
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
                    className="text-[15px] font-semibold"
                    style={{ fontFamily: HANDWRITING_FONT, color: "hsl(25, 55%, 12%)" }}
                  >
                    {entry.text}
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ fontFamily: FONT, color: "hsl(25, 30%, 40%)" }}>
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
