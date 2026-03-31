import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, LogIn, UserPlus } from "lucide-react";

const FONT = "'Times New Roman', Times, serif";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/library");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      style={{ fontFamily: FONT }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-secondary bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-warm-brown">FunTaskIt</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Welcome back, scholar!" : "Join the library"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
              className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Please wait…" : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
