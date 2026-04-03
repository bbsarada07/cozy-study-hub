
-- User files metadata
CREATE TABLE public.user_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  last_page INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own files" ON public.user_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own files" ON public.user_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON public.user_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON public.user_files FOR DELETE USING (auth.uid() = user_id);

-- Annotations
CREATE TABLE public.annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 0,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('highlight', 'note', 'drawing')),
  data JSONB NOT NULL DEFAULT '{}',
  color TEXT DEFAULT '#FFD700',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own annotations" ON public.annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own annotations" ON public.annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own annotations" ON public.annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own annotations" ON public.annotations FOR DELETE USING (auth.uid() = user_id);

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INT NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Doubt history
CREATE TABLE public.doubt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  page_number INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.doubt_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own doubts" ON public.doubt_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doubts" ON public.doubt_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for study files
INSERT INTO storage.buckets (id, name, public) VALUES ('study-files', 'study-files', false);
CREATE POLICY "Users can upload own study files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own study files" ON storage.objects FOR SELECT USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own study files" ON storage.objects FOR DELETE USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);
