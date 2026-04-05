import { useState } from "react";
import { User, Mail, Lock, LogOut, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

type Status = { type: "success" | "error"; message: string } | null;

function SectionFeedback({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className={`flex items-start gap-2 border px-3 py-2 text-xs font-mono ${
      status.type === "success"
        ? "border-green-500/40 bg-green-500/10 text-green-400"
        : "border-red-500/40 bg-red-500/10 text-red-400"
    }`}>
      {status.type === "success"
        ? <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
        : <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />}
      {status.message}
    </div>
  );
}

export function AccountPage() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleLogout = async () => {
    await fetch(`/api/auth/logout`, { method: "POST", credentials: "include" });
    await refetch();
    setLocation("/login");
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/auth/update-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus({ type: "success", message: "Email updated successfully." });
        setNewEmail("");
        setEmailPassword("");
        await refetch();
      } else {
        setEmailStatus({ type: "error", message: data.error || "Update failed." });
      }
    } catch {
      setEmailStatus({ type: "error", message: "Could not reach server." });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/auth/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordStatus({ type: "success", message: "Password updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({ type: "error", message: data.error || "Update failed." });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Could not reach server." });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <User className="h-10 w-10 opacity-20" />
        <p className="text-sm text-muted-foreground">You are not logged in.</p>
        <Button
          variant="outline"
          className="rounded-none font-mono text-xs uppercase tracking-widest"
          onClick={() => setLocation("/login")}
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-lg mx-auto w-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <User className="h-4 w-4 opacity-60" />
            Account Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="rounded-none font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground gap-1.5"
        >
          <LogOut className="h-3 w-3" />
          Logout
        </Button>
      </div>

      <div className="border-t border-white/10" />

      {/* Change Email */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          Change Email
        </h2>

        <SectionFeedback status={emailStatus} />

        <form onSubmit={handleUpdateEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">Current Email</Label>
            <Input
              value={user.email}
              disabled
              className="rounded-none bg-transparent border-white/10 font-mono text-sm opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">New Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
              disabled={emailLoading}
              className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">Confirm Password</Label>
            <Input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={emailLoading}
              className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={emailLoading || !newEmail || !emailPassword}
            className="rounded-none bg-transparent border border-white/30 hover:border-white/60 hover:bg-white/5 text-white font-mono text-xs uppercase tracking-widest w-full"
          >
            {emailLoading ? "Updating..." : "Update Email"}
          </Button>
        </form>
      </section>

      <div className="border-t border-white/10" />

      {/* Change Password */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          Change Password
        </h2>

        <p className="text-xs text-white/30">Password must be at least 6 characters.</p>

        <SectionFeedback status={passwordStatus} />

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={passwordLoading}
              className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={passwordLoading}
              className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/40 uppercase tracking-wider">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={passwordLoading}
              className="rounded-none bg-transparent border-white/20 focus-visible:border-white/60 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-none bg-transparent border border-white/30 hover:border-white/60 hover:bg-white/5 text-white font-mono text-xs uppercase tracking-widest w-full"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </section>

      <div className="pb-8" />
    </div>
  );
}
