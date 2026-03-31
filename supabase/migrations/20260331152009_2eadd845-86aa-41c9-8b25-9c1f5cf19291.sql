
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read any profile" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Study rooms
CREATE TABLE public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

-- Room members
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Room messages (real-time chat)
CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Room files
CREATE TABLE public.room_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_files ENABLE ROW LEVEL SECURITY;

-- Room questions (Q&A)
CREATE TABLE public.room_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_questions ENABLE ROW LEVEL SECURITY;

-- Question answers
CREATE TABLE public.room_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.room_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answer TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_answers ENABLE ROW LEVEL SECURITY;

-- RLS: Members can access room data
-- Helper function: check if user is room member
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id UUID, _room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Study rooms: authenticated can see all rooms, members can use them
CREATE POLICY "Anyone can view rooms" ON public.study_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.study_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Room members
CREATE POLICY "Members can view room members" ON public.room_members FOR SELECT TO authenticated USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "Users can join rooms" ON public.room_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.room_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Room messages
CREATE POLICY "Members can view messages" ON public.room_messages FOR SELECT TO authenticated USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "Members can send messages" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_room_member(auth.uid(), room_id));

-- Room files
CREATE POLICY "Members can view files" ON public.room_files FOR SELECT TO authenticated USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "Members can upload files" ON public.room_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_room_member(auth.uid(), room_id));

-- Room questions
CREATE POLICY "Members can view questions" ON public.room_questions FOR SELECT TO authenticated USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "Members can ask questions" ON public.room_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_room_member(auth.uid(), room_id));

-- Room answers
CREATE POLICY "Members can view answers" ON public.room_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.room_questions q WHERE q.id = question_id AND public.is_room_member(auth.uid(), q.room_id))
);
CREATE POLICY "Members can post answers" ON public.room_answers FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() = user_id OR is_ai = true) AND
  EXISTS (SELECT 1 FROM public.room_questions q WHERE q.id = question_id AND public.is_room_member(auth.uid(), q.room_id))
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- Storage bucket for room files
INSERT INTO storage.buckets (id, name, public) VALUES ('room-files', 'room-files', true);

CREATE POLICY "Authenticated can upload room files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room-files');
CREATE POLICY "Anyone can view room files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'room-files');
