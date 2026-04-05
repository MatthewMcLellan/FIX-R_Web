import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, ArrowLeft, Plus, Pencil, Trash2, ShieldCheck, ShieldOff, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
}

type FormMode = "create" | "edit" | null;

function Alert({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`px-4 py-3 text-sm border ${type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-green-500/50 bg-green-500/10 text-green-400"}`}>
      {msg}
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [mode, setMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", isAdmin: false, isActive: true });
  const [saving, setSaving] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadUsers = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/users", { credentials: "include" });
    const d = await r.json();
    if (d.users) setUsers(d.users);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setForm({ email: "", password: "", isAdmin: false, isActive: true });
    setEditTarget(null);
    setMode("create");
  };

  const openEdit = (u: User) => {
    setForm({ email: u.email, password: "", isAdmin: u.is_admin, isActive: u.is_active });
    setEditTarget(u);
    setMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let r: Response;
      if (mode === "create") {
        r = await fetch("/api/admin/users", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password, isAdmin: form.isAdmin, isActive: form.isActive }) });
      } else {
        r = await fetch(`/api/admin/users/${editTarget!.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password || undefined, isAdmin: form.isAdmin, isActive: form.isActive }) });
      }
      const d = await r.json();
      if (!r.ok) { showAlert("error", d.error || "Failed"); }
      else { showAlert("success", mode === "create" ? "User created" : "User updated"); setMode(null); loadUsers(); }
    } catch { showAlert("error", "Request failed"); }
    setSaving(false);
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete user ${u.email}? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", credentials: "include" });
    const d = await r.json();
    if (!r.ok) showAlert("error", d.error || "Failed");
    else { showAlert("success", "User deleted"); loadUsers(); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Users className="h-5 w-5" />
            <h1 className="text-sm font-bold uppercase tracking-widest">User Management</h1>
          </div>
          <Button size="sm" onClick={openCreate} className="rounded-none gap-1 text-xs">
            <Plus className="h-3 w-3" />
            New User
          </Button>
        </div>

        {alert && <Alert type={alert.type} msg={alert.msg} />}

        {/* Form */}
        {mode && (
          <form onSubmit={handleSubmit} className="border border-border p-4 sm:p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {mode === "create" ? "Create New User" : `Edit: ${editTarget?.email}`}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" className="rounded-none font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Password {mode === "edit" && <span className="text-muted-foreground/60">(leave blank to keep)</span>}
                </label>
                <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required={mode === "create"} className="rounded-none font-mono text-sm" />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} className="w-4 h-4" />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                Active
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} size="sm" className="rounded-none text-xs">
                {saving ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-none text-xs" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Users list */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="border border-border p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-sidebar-accent/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-medium truncate">{u.email}</span>
                    {u.is_admin && (
                      <span className="inline-flex items-center gap-1 text-xs border border-yellow-500/50 text-yellow-400 px-1.5 py-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" /> Admin
                      </span>
                    )}
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs border border-green-500/30 text-green-400 px-1.5 py-0.5">
                        <CheckCircle className="h-2.5 w-2.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs border border-red-500/30 text-red-400 px-1.5 py-0.5">
                        <XCircle className="h-2.5 w-2.5" /> Banned
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(u)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {u.is_active ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" title="Ban user" onClick={() => fetch(`/api/admin/users/${u.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) }).then(() => { showAlert("success", "User banned"); loadUsers(); })}>
                      <ShieldOff className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-400" title="Unban user" onClick={() => fetch(`/api/admin/users/${u.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) }).then(() => { showAlert("success", "User unbanned"); loadUsers(); })}>
                      <ShieldCheck className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
