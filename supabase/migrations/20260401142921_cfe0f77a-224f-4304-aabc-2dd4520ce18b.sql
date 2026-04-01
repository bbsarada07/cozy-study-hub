-- Add room_timer table for shared Pomodoro timer
CREATE TABLE public.room_timer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL UNIQUE,
  end_time timestamptz,
  phase text NOT NULL DEFAULT 'idle' CHECK (phase IN ('focus', 'break', 'idle')),
  started_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_timer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view timer" ON public.room_timer
  FOR SELECT TO authenticated USING (is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can update timer" ON public.room_timer
  FOR UPDATE TO authenticated USING (is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can insert timer" ON public.room_timer
  FOR INSERT TO authenticated WITH CHECK (is_room_member(auth.uid(), room_id));

-- Add typing/raise hand status to room_members
ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS is_typing boolean NOT NULL DEFAULT false;
ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS hand_raised boolean NOT NULL DEFAULT false;

-- Enable realtime for timer and room_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_timer;
