import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import { useUnlocks, STORE_ITEMS } from "@/hooks/useUnlocks";
import { toast } from "sonner";
import RoomChat from "@/components/room/RoomChat";
import RoomFiles from "@/components/room/RoomFiles";
import RoomQA from "@/components/room/RoomQA";
import RoomQuiz from "@/components/room/RoomQuiz";
import RoomTimer from "@/components/room/RoomTimer";
import TestYourself from "@/components/room/TestYourself";
import PointsDisplay from "@/components/room/PointsDisplay";
import StoreModal from "@/components/room/StoreModal";

const FONT = "'Times New Roman', Times, serif";

type Tab = "chat" | "files" | "quiz" | "qa" | "test";

const TAB_CONFIG: { id: Tab; label: string; emoji: string }[] = [
  { id: "chat", label: "Chat", emoji: "💬" },
  { id: "files", label: "Files", emoji: "📄" },
  { id: "quiz", label: "Quiz", emoji: "🧠" },
  { id: "qa", label: "Q&A", emoji: "❓" },
  { id: "test", label: "Test", emoji: "📝" },
];

const StudyRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, awardPoints, spendPoints } = usePoints(user?.id);
  const { isUnlocked, unlockFeature, getRecommendation } = useUnlocks(user?.id);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => {
    if (!roomId || !user) return;

    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from("study_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!roomData) {
        toast.error("Room not found");
        navigate("/group-study");
        return;
      }
      setRoom(roomData);

      const { data: memberData } = await supabase
        .from("room_members")
        .select("*, profiles:user_id(username, avatar_url)")
        .eq("room_id", roomId);

      setMembers(memberData || []);
      setLoading(false);
    };

    fetchRoom();

    const channel = supabase
      .channel(`room-members-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => {
        fetchRoom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, user, navigate]);

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast.success("Room code copied!");
    }
  };

  const shareRoom = () => {
    const url = `${window.location.origin}/join?code=${room?.code}`;
    if (navigator.share) {
      navigator.share({ title: room?.name, text: `Join my study room: ${room?.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    }
  };

  const handleUnlock = async (item: typeof STORE_ITEMS[number]) => {
    const success = await spendPoints(item.cost, `Unlocked ${item.name}`);
    if (!success) return;
    const expiresAt = item.duration
      ? new Date(Date.now() + item.duration).toISOString()
      : null;
    await unlockFeature(item.id, expiresAt);
    toast.success(`${item.emoji} ${item.name} unlocked!`);
  };

  if (!user) { navigate("/auth"); return null; }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading room…</p>
      </div>
    );
  }

  const activeMembers = members.filter((m: any) => m.is_active);

  return (
    <div className="flex h-screen flex-col bg-background" style={{ fontFamily: FONT }}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-secondary px-4 py-3">
        <button onClick={() => navigate("/library")} className="text-warm-brown">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-warm-brown truncate">{room?.name}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-warm-brown"
            >
              Code: <span className="font-mono font-bold uppercase">{room?.code}</span>
              <Copy className="h-3 w-3" />
            </button>
            <span className="text-xs text-muted-foreground">
              · {activeMembers.length} active
            </span>
          </div>
        </div>

        {/* Points + Store */}
        <PointsDisplay
          points={points.totalPoints}
          streak={points.dailyStreak}
          onClick={() => setStoreOpen(true)}
        />

        {/* Member avatars */}
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-bold ${
                  m.is_active ? "bg-primary/20 text-warm-brown" : "bg-secondary text-muted-foreground"
                }`}
                title={m.profiles?.username}
              >
                {(m.profiles?.username || "?")[0].toUpperCase()}
              </div>
            ))}
            {members.length > 4 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-muted-foreground">
                +{members.length - 4}
              </div>
            )}
          </div>
          <button onClick={shareRoom} className="ml-2 rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Shared Timer */}
      <div className="border-b border-secondary px-4 py-2">
        <RoomTimer roomId={roomId!} user={user} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary px-1 overflow-x-auto">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 whitespace-nowrap py-3 text-center text-xs sm:text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "border-b-2 border-primary text-warm-brown"
                : "text-muted-foreground hover:text-warm-brown-light"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && <RoomChat roomId={roomId!} user={user} />}
        {activeTab === "files" && <RoomFiles roomId={roomId!} user={user} />}
        {activeTab === "quiz" && <RoomQuiz roomId={roomId!} user={user} />}
        {activeTab === "qa" && <RoomQA roomId={roomId!} user={user} />}
        {activeTab === "test" && (
          <TestYourself
            roomId={roomId!}
            user={user}
            isUnlocked={isUnlocked}
            onAwardPoints={awardPoints}
          />
        )}
      </div>

      {/* Store Modal */}
      <StoreModal
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        totalPoints={points.totalPoints}
        isUnlocked={isUnlocked}
        onUnlock={handleUnlock}
      />
    </div>
  );
};

export default StudyRoom;
