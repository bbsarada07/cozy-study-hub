import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";

interface Props {
  roomId: string;
  user: User;
}

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

const RoomChat = ({ roomId, user }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("room_messages")
      .select("*, profiles:user_id(username, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as any) || []);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        // Fetch with profile join for new message
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      message: input.trim(),
    });
    if (!error) setInput("");
    setSending(false);
  };

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="pt-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hi! 👋
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((msg) => {
            const isMe = msg.user_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}>
                  {!isMe && (
                    <p className="mb-0.5 text-xs font-bold text-warm-brown">
                      {msg.profiles?.username || "User"}
                    </p>
                  )}
                  <p>{msg.message}</p>
                  <p className={`mt-1 text-right text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-secondary px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default RoomChat;
