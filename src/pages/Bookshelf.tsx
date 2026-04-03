import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, BookOpen, FileText, Image, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudyReader, type UserFile } from "@/hooks/useStudyReader";
import { useToast } from "@/hooks/use-toast";

const FONT = "'Times New Roman', Times, serif";

const Bookshelf = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const { files, loading, uploadFile, deleteFile } = useStudyReader(userId);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Upload PDF, images, or text files.", variant: "destructive" });
      return;
    }
    await uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-8 w-8 text-accent" />;
    if (type === "text/plain") return <FileText className="h-8 w-8 text-accent" />;
    return <BookOpen className="h-8 w-8 text-primary" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: FONT }}>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md">
        <button onClick={() => navigate("/library")} className="rounded-full p-2 transition-colors hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-xl font-bold text-foreground">My Bookshelf</h1>
        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95">
          <Upload className="h-4 w-4" />
          Upload
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" className="hidden" onChange={handleUpload} />
        </label>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {loading && <p className="text-center text-muted-foreground">Uploading...</p>}

        {files.length === 0 && !loading && (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">Your bookshelf is empty</p>
            <p className="text-sm text-muted-foreground">Upload PDF, images, or text files to start studying</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file: UserFile) => (
            <button
              key={file.id}
              onClick={() => navigate(`/reader/${file.id}`)}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {getFileIcon(file.file_type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{file.file_name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatSize(file.file_size)}</span>
                  {file.last_page > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Page {file.last_page}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                className="shrink-0 rounded-full p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Bookshelf;
