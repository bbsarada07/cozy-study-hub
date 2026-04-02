
-- User points table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  daily_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON public.user_points FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Points history table
CREATE TABLE public.points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  room_id uuid REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.points_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.points_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User unlocks table
CREATE TABLE public.user_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_name text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, feature_name)
);

ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks" ON public.user_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own unlocks" ON public.user_unlocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own unlocks" ON public.user_unlocks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Test sets table (per room)
CREATE TABLE public.test_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  topic text NOT NULL,
  exam_type text NOT NULL DEFAULT 'custom',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view test sets" ON public.test_sets FOR SELECT TO authenticated USING (is_room_member(auth.uid(), room_id));
CREATE POLICY "Room members can create test sets" ON public.test_sets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND is_room_member(auth.uid(), room_id));

-- Room leaderboard view: allow members to see each other's points within a room
CREATE POLICY "Members can view room points" ON public.points_history FOR SELECT TO authenticated USING (room_id IS NOT NULL AND is_room_member(auth.uid(), room_id));

-- Allow all authenticated users to see points for leaderboard
CREATE POLICY "Anyone can view points for leaderboard" ON public.user_points FOR SELECT TO authenticated USING (true);
