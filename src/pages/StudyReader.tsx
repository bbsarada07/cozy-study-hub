import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Timer, Bot, StickyNote, Highlighter, X, Send, ChevronLeft, ChevronRight, BookOpen, History, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudyReader } from "@/hooks/useStudyReader";
import { useToast } from "@/hooks/use-toast";

const FONT = "'Times New Roman', Times, serif";
const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

type AIPanel = "none" | "ask" | "history";

const StudyReader = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string>();
  const [file, setFile] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Pomodoro
  const [timerSeconds, setTimerSeconds] = useState(FOCUS_DURATION);
  const [timerRunning, setTimerRunning] = useState(true);
  const [timerPhase, setTimerPhase] = useState<"focus" | "break">("focus");
  const [showTimerPopup, setShowTimerPopup] = useState(false);

  // Annotations
  const [showAnnotationBar, setShowAnnotationBar] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [annotationMode, setAnnotationMode] = useState<"none" | "highlight" | "note">("none");

  // AI
  const [aiPanel, setAiPanel] = useState<AIPanel>("none");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [selectedText, setSelectedText] = useState("");

  // Focus mode dim
  const [focusDim, setFocusDim] = useState(false);

  const {
    annotations,
    fetchAnnotations,
    addAnnotation,
    deleteAnnotation,
    updateLastPage,
    saveSession,
    saveDoubt,
    fetchDoubts,
  } = useStudyReader(userId);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  // Load file
  useEffect(() => {
    if (!userId || !fileId) return;
    supabase
      .from("user_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "File not found", variant: "destructive" });
          navigate("/bookshelf");
          return;
        }
        setFile(data);
        setCurrentPage(data.last_page || 0);
      });
    fetchAnnotations(fileId);
  }, [userId, fileId, navigate, toast, fetchAnnotations]);

  // Pomodoro timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setShowTimerPopup(true);
          if (timerPhase === "focus" && fileId) {
            saveSession(fileId, true, 25);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerPhase, fileId, saveSession]);

  // Focus dim effect
  useEffect(() => {
    const t = setTimeout(() => setFocusDim(timerRunning && timerPhase === "focus"), 3000);
    return () => clearTimeout(t);
  }, [timerRunning, timerPhase]);

  // Text selection listener
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()?.toString().trim() || "";
      setSelectedText(sel);
    };
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, []);

  // Save last page on change
  useEffect(() => {
    if (fileId && currentPage > 0) updateLastPage(fileId, currentPage);
  }, [currentPage, fileId, updateLastPage]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleTimerAction = (action: "break" | "continue") => {
    setShowTimerPopup(false);
    if (action === "break") {
      setTimerPhase("break");
      setTimerSeconds(BREAK_DURATION);
    } else {
      setTimerPhase("focus");
      setTimerSeconds(FOCUS_DURATION);
    }
    setTimerRunning(true);
  };

  // AI streaming call
  const askAI = useCallback(
    async (action: string, question?: string) => {
      if (!fileId) return;
      setAiLoading(true);
      setAiAnswer("");
      setAiPanel("ask");

      const body: any = { action };
      if (action === "explain") body.selectedText = selectedText || question;
      if (action === "doubt") body.question = question || aiQuestion;
      if (action === "summarize") body.pageContent = `Page ${currentPage} content`;

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-assistant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
          }
        );

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || "AI request failed");
        }

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No stream");
        const decoder = new TextDecoder();
        let buf = "";
        let fullAnswer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullAnswer += content;
                setAiAnswer(fullAnswer);
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }

        // Save to doubt history
        if (action === "doubt" && question) {
          await saveDoubt(fileId, question, fullAnswer, currentPage);
        }
      } catch (e: any) {
        toast({ title: "AI Error", description: e.message, variant: "destructive" });
      } finally {
        setAiLoading(false);
      }
    },
    [fileId, selectedText, aiQuestion, currentPage, saveDoubt, toast]
  );

  const loadDoubts = useCallback(async () => {
    if (!fileId) return;
    const d = await fetchDoubts(fileId);
    setDoubts(d);
    setAiPanel("history");
  }, [fileId, fetchDoubts]);

  const handleAddNote = async () => {
    if (!fileId || !noteText.trim()) return;
    await addAnnotation(fileId, currentPage, "note", { text: noteText });
    setNoteText("");
    toast({ title: "Note saved!" });
  };

  const handleHighlight = async () => {
    if (!fileId || !selectedText) {
      toast({ title: "Select text first", variant: "destructive" });
      return;
    }
    await addAnnotation(fileId, currentPage, "highlight", { text: selectedText });
    toast({ title: "Highlight saved!" });
  };

  if (!file) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isImage = file.file_type?.startsWith("image/");
  const isPdf = file.file_type === "application/pdf";

  return (
    <div className="relative flex min-h-screen flex-col bg-background" style={{ fontFamily: FONT }}>
      {/* Focus dim overlay */}
      {focusDim && (
        <div className="pointer-events-none fixed inset-0 z-30 bg-foreground/5 transition-opacity duration-1000" />
      )}

      {/* Minimal top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-2 bg-card/80 px-3 py-2 backdrop-blur-md">
        <button onClick={() => navigate("/bookshelf")} className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{file.file_name}</p>

        {/* Timer */}
        <button
          onClick={() => setTimerRunning(!timerRunning)}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
            timerPhase === "focus"
              ? "bg-primary/20 text-primary"
              : "bg-accent/20 text-accent"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          {formatTime(timerSeconds)}
        </button>

        {/* Annotation toggle */}
        <button
          onClick={() => setShowAnnotationBar(!showAnnotationBar)}
          className={`rounded-full p-2 transition-colors ${showAnnotationBar ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        >
          <StickyNote className="h-4 w-4" />
        </button>

        {/* AI button */}
        <button
          onClick={() => setAiPanel(aiPanel === "none" ? "ask" : "none")}
          className={`rounded-full p-2 transition-colors ${aiPanel !== "none" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        >
          <Bot className="h-4 w-4" />
        </button>
      </header>

      {/* Annotation bar */}
      {showAnnotationBar && (
        <div className="sticky top-12 z-30 flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <button
            onClick={handleHighlight}
            className="flex items-center gap-1 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-all hover:bg-accent/30"
          >
            <Highlighter className="h-3.5 w-3.5" /> Highlight Selected
          </button>
          <div className="flex flex-1 items-center gap-1">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            />
            <button onClick={handleAddNote} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Main reading area */}
      <div className="flex flex-1">
        <div className="flex-1 overflow-auto p-4">
          {/* File viewer */}
          <div className="mx-auto max-w-3xl">
            {isPdf && (
              <iframe
                src={`${file.file_url}#page=${currentPage + 1}`}
                className="h-[75vh] w-full rounded-xl border border-border shadow-sm"
                title={file.file_name}
              />
            )}
            {isImage && (
              <img
                src={file.file_url}
                alt={file.file_name}
                className="w-full rounded-xl border border-border shadow-sm"
              />
            )}
            {!isPdf && !isImage && (
              <div className="rounded-xl border border-border bg-card p-6 text-foreground">
                <p className="text-sm text-muted-foreground">Text file preview not available. Use the AI assistant to ask questions about this file.</p>
              </div>
            )}

            {/* Page annotations */}
            {annotations.filter((a) => a.page_number === currentPage).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Annotations on this page:</p>
                {annotations
                  .filter((a) => a.page_number === currentPage)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2 rounded-lg border border-border bg-card p-3"
                    >
                      <span
                        className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <div className="flex-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {a.annotation_type}
                        </span>
                        <p className="text-sm text-foreground">
                          {a.data?.text || JSON.stringify(a.data)}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(a.id, a.file_id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Page navigation (for PDFs) */}
            {isPdf && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage <= 0}
                  className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-muted-foreground">Page {currentPage + 1}</span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Panel */}
        {aiPanel !== "none" && (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
            {/* AI panel header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Bot className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-bold text-foreground">AI Study Assistant</span>
              <button onClick={loadDoubts} className="rounded-full p-1.5 hover:bg-secondary" title="Doubt history">
                <History className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setAiPanel("none")} className="rounded-full p-1.5 hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {aiPanel === "ask" && (
              <div className="flex flex-1 flex-col">
                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
                  {selectedText && (
                    <button
                      onClick={() => askAI("explain")}
                      className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground"
                    >
                      <Sparkles className="h-3 w-3" /> Explain Selected
                    </button>
                  )}
                  <button
                    onClick={() => askAI("summarize")}
                    className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    <BookOpen className="h-3 w-3" /> Summarize Page
                  </button>
                </div>

                {/* Answer area */}
                <div className="flex-1 overflow-auto px-4 py-3">
                  {aiAnswer ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {aiAnswer}
                    </div>
                  ) : aiLoading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select text and click "Explain", or type a question below.
                    </p>
                  )}
                </div>

                {/* Question input */}
                <div className="flex items-center gap-2 border-t border-border px-3 py-3">
                  <input
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask a doubt..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && aiQuestion.trim()) {
                        askAI("doubt", aiQuestion);
                        setAiQuestion("");
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (aiQuestion.trim()) {
                        askAI("doubt", aiQuestion);
                        setAiQuestion("");
                      }
                    }}
                    disabled={aiLoading}
                    className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {aiPanel === "history" && (
              <div className="flex-1 overflow-auto px-4 py-3">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">Previous Doubts</p>
                {doubts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No doubts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {doubts.map((d: any) => (
                      <div key={d.id} className="rounded-lg border border-border p-3">
                        <p className="text-xs font-bold text-primary">Q: {d.question}</p>
                        <p className="mt-1 text-xs text-foreground">{d.answer?.slice(0, 200)}...</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Page {d.page_number} · {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timer completion popup */}
      {showTimerPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40">
          <div className="mx-4 w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl" style={{ fontFamily: FONT }}>
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="mb-2 text-xl font-bold text-foreground">
              {timerPhase === "focus" ? "25 minutes completed!" : "Break's over!"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {timerPhase === "focus"
                ? "Great focus session! Do you want to take a break?"
                : "Ready to get back to studying?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleTimerAction(timerPhase === "focus" ? "break" : "continue")}
                className="flex-1 rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >
                {timerPhase === "focus" ? "Take Break" : "Start Focus"}
              </button>
              <button
                onClick={() => handleTimerAction(timerPhase === "focus" ? "continue" : "break")}
                className="flex-1 rounded-full bg-secondary px-4 py-3 font-semibold text-foreground"
              >
                {timerPhase === "focus" ? "Keep Going" : "More Break"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyReader;
