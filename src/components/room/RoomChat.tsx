import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Hand } from "lucide-react";
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("room_messages")
      .select("*, profiles:user_id(username, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as any) || []);
  }, [roomId]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("room_members")
      .select("user_id, is_typing, hand_raised, profiles:user_id(username)")
      .eq("room_id", roomId);
    if (data) {
      setTypingUsers(
        data.filter((m: any) => m.is_typing && m.user_id !== user.id)
          .map((m: any) => m.profiles?.username || "Someone")
      );
      setRaisedHands(
        data.filter((m: any) => m.hand_raised)
          .map((m: any) => m.profiles?.username || "Someone")
      );
    }
  }, [roomId, user.id]);

  useEffect(() => {
    fetchMessages();
    fetchMembers();

    const msgChannel = supabase
      .channel(`room-chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${roomId}`,
      }, () => fetchMessages())
      .subscribe();

    const memberChannel = supabase
      .channel(`room-members-typing-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "room_members",
        filter: `room_id=eq.${roomId}`,
      }, () => fetchMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [roomId, fetchMessages, fetchMembers]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const setTyping = async (typing: boolean) => {
    await supabase
      .from("room_members")
      .update({ is_typing: typing })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);
  };

  const toggleHand = async () => {
    const newVal = !handRaised;
    setHandRaised(newVal);
    await supabase
      .from("room_members")
      .update({ hand_raised: newVal })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

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
      {/* Raised hands banner */}
      {raisedHands.length > 0 && (
        <div className="flex items-center gap-2 border-b border-secondary bg-accent/10 px-4 py-2 text-xs text-accent-foreground">
          <Hand className="h-3.5 w-3.5" />
          <span className="font-semibold">
            {raisedHands.join(", ")} raised hand{raisedHands.length > 1 ? "s" : ""} ✋
          </span>
        </div>
      )}

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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <p className="mt-2 text-xs italic text-muted-foreground">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
          </p>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-secondary px-4 py-3">
        <button
          type="button"
          onClick={toggleHand}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
            handRaised ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
          }`}
          title="Raise hand"
        >
          <Hand className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={handleInputChange}
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
