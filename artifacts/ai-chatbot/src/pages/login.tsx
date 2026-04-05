import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Terminal, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import logoImg from "@assets/Logo_No-Text@2x_1775332629416.png";
import fixrBg from "@assets/FIX-R3_1775331489750.png";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        await refetch();
        setLocation("/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden font-mono">
      <img
        src={fixrBg}
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] sm:w-[60%] max-w-[500px] opacity-[0.06] pointer-events-none select-none"
      />

      <div className="relative z-10 w-full max-w-sm px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={logoImg} alt="FIX-R" className="h-14 w-auto" style={{ mixBlendMode: "screen" }} />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">Authentication Required</span>
          </div>
        </div>

        <div className="border border-white/20 p-6 space-y-5 bg-black/40 backdrop-blur-sm">
          <h1 className="text-center text-sm uppercase tracking-widest text-white/70">Login</h1>

          {error && (
            <div className="border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-mono">
              ERR: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-white/50">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={loading}
                className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-white/50">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full rounded-none bg-transparent border border-white/40 hover:border-white/80 hover:bg-white/5 text-white font-mono text-xs uppercase tracking-widest transition-all"
            >
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">
          Don't have an account?{" "}
          <Link href="/signup" className="text-white/60 hover:text-white transition-colors underline underline-offset-2">
            Sign up
          </Link>
        </p>

        <p className="text-center text-white/20 text-xs mt-4">© 2026 AM Solutions, LLC</p>
      </div>
    </div>
  );
}
