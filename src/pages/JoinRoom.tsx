import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const JoinRoom = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const code = params.get("code");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=/join?code=${code}`);
      return;
    }
    if (!code) {
      navigate("/group-study");
      return;
    }

    const joinRoom = async () => {
      const { data: room } = await supabase
        .from("study_rooms")
        .select("id")
        .eq("code", code.toLowerCase())
        .single();

      if (!room) {
        toast.error("Room not found");
        navigate("/group-study");
        return;
      }

      await supabase.from("room_members").upsert(
        { room_id: room.id, user_id: user.id },
        { onConflict: "room_id,user_id" }
      );

      toast.success("Joined room!");
      navigate(`/room/${room.id}`);
    };

    joinRoom();
  }, [user, loading, code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Joining room…</p>
    </div>
  );
};

export default JoinRoom;
