import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, KeyRound, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import fixrBg from "@assets/FIX-R3_1775331489750.png";
import logoImg from "@assets/Logo_No-Text@2x_1775332629416.png";

export function SignupPage() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [form, setForm] = useState({ accessCode: "", email: "", password: "", confirm: "" });
  const [tosAccepted, setTosAccepted] = useState(false);
  const [tosViewed, setTosViewed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTosClick = () => setTosViewed(true);

  const handleTosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && !tosViewed) {
      setError("You must open and read the Terms of Service before agreeing.");
      return;
    }
    setError("");
    setTosAccepted(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!tosViewed) {
      setError("You must read the Terms of Service before creating an account");
      return;
    }
    if (!tosAccepted) {
      setError("You must agree to the Terms of Service");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, accessCode: form.accessCode }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Signup failed");
      } else {
        await refetch();
        setLocation("/");
      }
    } catch {
      setError("Network error — please try again");
    }
    setLoading(false);
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
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors block mb-6">
          ← Back to Login
        </Link>

        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={logoImg} alt="FIX-R" className="h-14 w-auto" style={{ mixBlendMode: "screen" }} />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">Create Account</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 text-sm border border-destructive/50 bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Access Code */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <KeyRound className="h-3 w-3" />
              Access Code
            </label>
            <Input
              value={form.accessCode}
              onChange={(e) => setForm({ ...form, accessCode: e.target.value })}
              placeholder="XXXX-XXXX-XXXX"
              required
              className="rounded-none font-mono text-sm border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">A valid access code is required to register.</p>
            <a
              href="https://www.sea-am-sol.com/challenges"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              <ExternalLink className="h-3 w-3" />
              Purchase Access Key
            </a>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="rounded-none font-mono text-sm border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="rounded-none font-mono text-sm border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
            <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm Password</label>
            <Input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              className="rounded-none font-mono text-sm border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>

          {/* ToS */}
          <div className="border border-border/50 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={handleTosChange}
                className="mt-0.5 w-4 h-4 shrink-0"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I have read and agree to the{" "}
                <a
                  href="/Terms_of_Service.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleTosClick}
                  className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
                {" "}and am at least 13 years old.{" "}
                <span className={`text-xs font-semibold ${tosViewed ? "text-green-400" : "text-red-400"}`}>
                  {tosViewed ? "✓ Viewed" : "Not Viewed"}
                </span>
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none uppercase tracking-widest text-xs"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">
            Log in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground/40 mt-6 absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          © 2026 AM Solutions, LLC
        </p>
      </div>
    </div>
  );
}
