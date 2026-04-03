import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string;
  last_page: number;
  created_at: string;
}

export interface Annotation {
  id: string;
  file_id: string;
  page_number: number;
  annotation_type: string;
  data: any;
  color: string;
  created_at: string;
}

export function useStudyReader(userId: string | undefined) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading files", description: error.message, variant: "destructive" });
    } else {
      setFiles((data as any[]) || []);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!userId) return null;
      setLoading(true);
      try {
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("study-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("study-files")
          .getPublicUrl(filePath);

        // For private buckets, use createSignedUrl instead
        const { data: signedData } = await supabase.storage
          .from("study-files")
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        const fileUrl = signedData?.signedUrl || urlData.publicUrl;

        const { data: fileRecord, error: dbError } = await supabase
          .from("user_files")
          .insert({
            user_id: userId,
            file_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            file_type: file.type || "application/pdf",
          })
          .select()
          .single();
        if (dbError) throw dbError;

        await fetchFiles();
        toast({ title: "File uploaded!" });
        return fileRecord as unknown as UserFile;
      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchFiles, toast]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!userId) return;
      await supabase.from("user_files").delete().eq("id", fileId);
      await fetchFiles();
    },
    [userId, fetchFiles]
  );

  const fetchAnnotations = useCallback(
    async (fileId: string) => {
      if (!userId) return;
      const { data } = await supabase
        .from("annotations")
        .select("*")
        .eq("file_id", fileId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      setAnnotations((data as any[]) || []);
    },
    [userId]
  );

  const addAnnotation = useCallback(
    async (fileId: string, pageNumber: number, type: string, data: any, color?: string) => {
      if (!userId) return;
      await supabase.from("annotations").insert({
        user_id: userId,
        file_id: fileId,
        page_number: pageNumber,
        annotation_type: type,
        data,
        color: color || "#FFD700",
      });
      await fetchAnnotations(fileId);
    },
    [userId, fetchAnnotations]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string, fileId: string) => {
      await supabase.from("annotations").delete().eq("id", annotationId);
      await fetchAnnotations(fileId);
    },
    [fetchAnnotations]
  );

  const updateLastPage = useCallback(
    async (fileId: string, page: number) => {
      if (!userId) return;
      await supabase.from("user_files").update({ last_page: page }).eq("id", fileId);
    },
    [userId]
  );

  const saveSession = useCallback(
    async (fileId: string, completed: boolean, durationMinutes: number) => {
      if (!userId) return;
      await supabase.from("study_sessions").insert({
        user_id: userId,
        file_id: fileId,
        completed,
        duration_minutes: durationMinutes,
        end_time: new Date().toISOString(),
      });
    },
    [userId]
  );

  const saveDoubt = useCallback(
    async (fileId: string, question: string, answer: string, pageNumber?: number) => {
      if (!userId) return;
      await supabase.from("doubt_history").insert({
        user_id: userId,
        file_id: fileId,
        question,
        answer,
        page_number: pageNumber || 0,
      });
    },
    [userId]
  );

  const fetchDoubts = useCallback(
    async (fileId: string) => {
      if (!userId) return [];
      const { data } = await supabase
        .from("doubt_history")
        .select("*")
        .eq("file_id", fileId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    [userId]
  );

  return {
    files,
    annotations,
    loading,
    uploadFile,
    deleteFile,
    fetchAnnotations,
    addAnnotation,
    deleteAnnotation,
    updateLastPage,
    saveSession,
    saveDoubt,
    fetchDoubts,
    refreshFiles: fetchFiles,
  };
}
