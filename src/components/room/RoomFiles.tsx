import { useState, useEffect } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const FONT = "'Times New Roman', Times, serif";

interface Props {
  roomId: string;
  user: User;
}

const RoomFiles = ({ roomId, user }: Props) => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("room_files")
      .select("*, profiles:user_id(username)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setFiles(data || []);
  };

  useEffect(() => { fetchFiles(); }, [roomId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      const path = `${roomId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("room-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("room-files").getPublicUrl(path);

      await supabase.from("room_files").insert({
        room_id: roomId,
        user_id: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
      });

      toast.success("File uploaded!");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT }}>
      {/* Upload button */}
      <div className="border-b border-secondary px-4 py-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
          <Upload className="h-5 w-5" />
          {uploading ? "Uploading…" : "Upload File (PDF, Image, Notes)"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {files.length === 0 && (
          <p className="pt-12 text-center text-sm text-muted-foreground">
            No files shared yet. Upload something! 📎
          </p>
        )}
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <a
              key={f.id}
              href={f.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-secondary bg-card p-3 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-warm-brown">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  by {f.profiles?.username || "User"} · {formatSize(f.file_size || 0)}
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomFiles;
