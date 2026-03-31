import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, LogIn as JoinIcon, Copy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const FONT = "'Times New Roman', Times, serif";

const GroupStudy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!roomName.trim() || !user) return;
    setLoading(true);
    try {
      const { data: room, error } = await supabase
        .from("study_rooms")
        .insert({ name: roomName.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      // Auto-join the creator
      await supabase.from("room_members").insert({ room_id: room.id, user_id: user.id });
      toast.success("Room created!");
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim() || !user) return;
    setLoading(true);
    try {
      const { data: room, error } = await supabase
        .from("study_rooms")
        .select("id")
        .eq("code", joinCode.trim().toLowerCase())
        .single();
      if (error || !room) throw new Error("Room not found. Check your code.");

      // Join (upsert to avoid duplicates)
      await supabase.from("room_members").upsert(
        { room_id: room.id, user_id: user.id },
        { onConflict: "room_id,user_id" }
      );
      toast.success("Joined room!");
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" style={{ fontFamily: FONT }}>
      <header className="flex items-center gap-3 border-b border-secondary px-5 py-4">
        <button onClick={() => navigate("/library")} className="text-warm-brown">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold text-warm-brown">Group Study 👥</h1>
      </header>

      <div className="flex flex-1 flex-col items-center px-4 pt-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-full bg-secondary p-1">
          <button
            onClick={() => setTab("create")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === "create" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
            }`}
          >
            <Plus className="h-4 w-4" /> Create Room
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === "join" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
            }`}
          >
            <JoinIcon className="h-4 w-4" /> Join Room
          </button>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-secondary bg-card p-6 shadow-lg">
          {tab === "create" ? (
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-warm-brown">Room Name</label>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Biology Study Group"
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={createRoom}
                disabled={!roomName.trim() || loading}
                className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create Study Room"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-warm-brown">Room Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter room code"
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={joinRoom}
                disabled={!joinCode.trim() || loading}
                className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {loading ? "Joining…" : "Join Study Room"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupStudy;
