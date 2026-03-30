import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

import libraryBg from "@/assets/library-room.png";
import librarianAvatar from "@/assets/avatars/librarian-avatar.png";

const FONT = "'Times New Roman', Times, serif";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "📋 Make Study Plan", prompt: "Help me create a study plan for my upcoming exams." },
  { label: "💡 Explain Topic", prompt: "Can you explain a concept to me in simple terms?" },
  { label: "📝 Summarize Notes", prompt: "Help me summarize my study notes." },
  { label: "🧠 Create Quiz", prompt: "Create a quiz to test my understanding." },
];

const SIMULATED_RESPONSES: Record<string, string> = {
  default:
    "That's a great question! Let me help you with that. Could you provide a bit more detail so I can give you the best guidance?",
  study:
    "I'd love to help you create a study plan! Here's what I suggest:\n\n📅 **Step 1:** List all your subjects and upcoming deadlines.\n📊 **Step 2:** Prioritize by difficulty and exam date.\n⏰ **Step 3:** Allocate 25-minute focused study blocks (Pomodoro technique).\n🔄 **Step 4:** Include review sessions every 2-3 days.\n\nWould you like me to create a detailed schedule for specific subjects?",
  explain:
    "I'd be happy to explain! Just tell me the topic or concept you're struggling with, and I'll break it down into simple, easy-to-understand parts. I can use analogies and examples to make it clearer. 📚",
  summarize:
    "Sure! Paste your notes here and I'll create a concise summary with:\n\n• **Key points** highlighted\n• **Important terms** defined\n• **Connections** between ideas mapped out\n\nReady when you are! ✍️",
  quiz: "Let's test your knowledge! Tell me the subject and topic, and I'll create a quiz with:\n\n1️⃣ Multiple choice questions\n2️⃣ True/False statements\n3️⃣ Short answer questions\n\nWhat subject should we start with?",
};

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("study plan") || lower.includes("schedule"))
    return SIMULATED_RESPONSES.study;
  if (lower.includes("explain") || lower.includes("concept"))
    return SIMULATED_RESPONSES.explain;
  if (lower.includes("summarize") || lower.includes("notes"))
    return SIMULATED_RESPONSES.summarize;
  if (lower.includes("quiz") || lower.includes("test"))
    return SIMULATED_RESPONSES.quiz;
  return SIMULATED_RESPONSES.default;
}

const AskLibrarian = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: getSimulatedResponse(text),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* Background */}
      <img
        src={libraryBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(18px)",
          backgroundColor: "hsla(40, 30%, 96%, 0.82)",
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "hsla(36, 70%, 50%, 0.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          onClick={() => navigate("/library")}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-primary-foreground" />
        </button>
        <img
          src={librarianAvatar}
          alt="Librarian"
          className="h-9 w-9 rounded-full border-2 border-primary-foreground/30 bg-white object-cover"
          width={36}
          height={36}
        />
        <div>
          <h1
            className="text-base font-bold text-primary-foreground"
            style={{ fontFamily: FONT }}
          >
            Ask Librarian 📚
          </h1>
          <p className="text-xs text-primary-foreground/70">
            Your study companion
          </p>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
        {/* Welcome section when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-8 animate-in fade-in duration-500">
            <img
              src={librarianAvatar}
              alt="Librarian"
              className="mb-4 h-24 w-24 rounded-full border-4 bg-white object-cover shadow-lg"
              style={{ borderColor: "hsl(36, 70%, 50%)" }}
              width={96}
              height={96}
            />
            <p
              className="mb-6 max-w-xs text-center text-lg font-semibold text-warm-brown"
              style={{ fontFamily: FONT }}
            >
              Hello, I'm your librarian. What would you like to learn today?
            </p>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="rounded-full px-4 py-2 text-sm font-semibold shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                  style={{
                    backgroundColor: "hsla(40, 30%, 96%, 0.95)",
                    color: "hsl(25, 50%, 22%)",
                    border: "1px solid hsla(36, 70%, 50%, 0.35)",
                    fontFamily: FONT,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <img
                  src={librarianAvatar}
                  alt=""
                  className="mr-2 mt-1 h-7 w-7 flex-shrink-0 rounded-full bg-white object-cover"
                  width={28}
                  height={28}
                />
              )}
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md"
                style={{
                  fontFamily: FONT,
                  ...(msg.role === "user"
                    ? {
                        backgroundColor: "hsla(30, 40%, 75%, 0.85)",
                        color: "hsl(25, 50%, 15%)",
                        borderBottomRightRadius: "4px",
                      }
                    : {
                        backgroundColor: "hsla(40, 30%, 98%, 0.95)",
                        color: "hsl(25, 40%, 20%)",
                        borderBottomLeftRadius: "4px",
                      }),
                }}
              >
                {msg.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-1" : ""}>
                    {line.replace(/\*\*(.*?)\*\*/g, "").length !== line.length
                      ? line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j}>{part}</strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )
                      : line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-2 animate-in fade-in duration-300">
              <img
                src={librarianAvatar}
                alt=""
                className="mt-1 h-7 w-7 rounded-full bg-white object-cover"
                width={28}
                height={28}
              />
              <div
                className="flex gap-1 rounded-2xl px-4 py-3 shadow-md"
                style={{ backgroundColor: "hsla(40, 30%, 98%, 0.95)" }}
              >
                <span className="h-2 w-2 animate-bounce rounded-full bg-warm-brown-light [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-warm-brown-light [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-warm-brown-light [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex items-center gap-2 border-t px-4 py-3"
        style={{
          backgroundColor: "hsla(40, 30%, 96%, 0.95)",
          borderColor: "hsla(36, 70%, 50%, 0.2)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Mic className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
          style={{
            fontFamily: FONT,
            backgroundColor: "hsla(40, 25%, 94%, 0.9)",
            borderColor: "hsla(36, 70%, 50%, 0.25)",
            color: "hsl(25, 40%, 20%)",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40"
          style={{ backgroundColor: "hsl(36, 70%, 50%)" }}
        >
          <Send className="h-5 w-5 text-primary-foreground" />
        </button>
      </form>
    </div>
  );
};

export default AskLibrarian;
