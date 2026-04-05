import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Activity, ArrowLeft, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityUser {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  login_count_24h: number;
  ip_addresses: string[] | null;
  last_login: string | null;
}

export function AdminActivity() {
  const [users, setUsers] = useState<ActivityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/user-activity", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Failed to load");
      else setUsers(d.users ?? []);
    } catch { setError("Request failed"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalUsers = users.length;
  const activeLogins = users.filter((u) => Number(u.login_count_24h) > 0).length;
  const suspicious = users.filter((u) => (u.ip_addresses?.length ?? 0) > 2).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Activity className="h-5 w-5" />
            <h1 className="text-sm font-bold uppercase tracking-widest">User Activity</h1>
          </div>
          <Button size="sm" variant="outline" className="rounded-none gap-1 text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Notice */}
        <div className="border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400/80">
          Login data shown is from the last 24 hours only.
        </div>

        {error && (
          <div className="px-4 py-3 text-sm border border-destructive/50 bg-destructive/10 text-destructive">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Users", value: totalUsers },
            { label: "Active (24h)", value: activeLogins },
            { label: "Multiple IPs", value: suspicious, warn: suspicious > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label} className={`border p-4 space-y-1 ${warn ? "border-yellow-500/40" : "border-border"}`}>
              <div className={`text-2xl font-bold font-mono ${warn ? "text-yellow-400" : ""}`}>{value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar">
                  {["Email", "Role", "Logins (24h)", "IP Addresses", "Last Login"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const count = Number(u.login_count_24h ?? 0);
                  const ips = u.ip_addresses?.filter(Boolean) ?? [];
                  const suspicious = ips.length > 2;
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-sidebar-accent/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2.5">
                        {u.is_admin ? (
                          <span className="text-xs border border-yellow-500/40 text-yellow-400 px-1.5 py-0.5">Admin</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">User</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-mono ${count > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                          {count}
                        </span>
                        {suspicious && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" />
                            Multi-IP
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {ips.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ips.map((ip, i) => (
                              <span key={i} className="text-xs font-mono bg-sidebar border border-border px-1.5 py-0.5">{ip}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
