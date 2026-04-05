import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { BarChart3, Users, Key, Megaphone, ShieldAlert, Activity } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  availableCodes: number;
  activeAnnouncements: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError("Failed to load stats"));
  }, []);

  if (!user?.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 opacity-30" />
        <p className="text-xs uppercase tracking-widest">Access Denied</p>
      </div>
    );
  }

  const panels = [
    { href: "/admin/users", icon: Users, label: "User Management", desc: "Create, edit, ban, or delete users" },
    { href: "/admin/access-codes", icon: Key, label: "Access Codes", desc: "Generate and manage invite codes" },
    { href: "/admin/announcements", icon: Megaphone, label: "Announcements", desc: "Post system-wide announcements" },
    { href: "/admin/activity", icon: Activity, label: "User Activity", desc: "Monitor logins and IP addresses" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest">Admin Panel</h1>
            <p className="text-xs text-muted-foreground mt-0.5">System overview and management</p>
          </div>
        </div>

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: stats?.totalUsers ?? "—" },
            { label: "Active Users", value: stats?.activeUsers ?? "—" },
            { label: "Available Codes", value: stats?.availableCodes ?? "—" },
            { label: "Active Alerts", value: stats?.activeAnnouncements ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border p-4 space-y-1">
              <div className="text-2xl font-bold font-mono">{value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Nav panels */}
        <div className="grid sm:grid-cols-3 gap-3">
          {panels.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="group border border-border p-5 hover:bg-sidebar-accent transition-colors space-y-2">
              <Icon className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="text-sm font-bold uppercase tracking-widest">{label}</div>
                <div className="text-xs text-muted-foreground mt-1">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
