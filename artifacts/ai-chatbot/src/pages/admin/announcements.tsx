import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Megaphone, ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TYPE_COLORS = {
  info: "border-blue-500/40 text-blue-400",
  warning: "border-yellow-500/40 text-yellow-400",
  success: "border-green-500/40 text-green-400",
  error: "border-red-500/40 text-red-400",
};

function Alert({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`px-4 py-3 text-sm border ${type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-green-500/50 bg-green-500/10 text-green-400"}`}>
      {msg}
    </div>
  );
}

type FormMode = "create" | "edit" | null;

export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [mode, setMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", message: "", type: "info" as Announcement["type"], isActive: true });
  const [saving, setSaving] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/announcements", { credentials: "include" });
    const d = await r.json();
    if (d.announcements) setItems(d.announcements);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ title: "", message: "", type: "info", isActive: true });
    setEditTarget(null);
    setMode("create");
  };

  const openEdit = (a: Announcement) => {
    setForm({ title: a.title, message: a.message, type: a.type, isActive: a.is_active });
    setEditTarget(a);
    setMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let r: Response;
      if (mode === "create") {
        r = await fetch("/api/admin/announcements", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, message: form.message, type: form.type, isActive: form.isActive }) });
      } else {
        r = await fetch(`/api/admin/announcements/${editTarget!.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, message: form.message, type: form.type, isActive: form.isActive }) });
      }
      const d = await r.json();
      if (!r.ok) showAlert("error", d.error || "Failed");
      else { showAlert("success", mode === "create" ? "Announcement created" : "Announcement updated"); setMode(null); load(); }
    } catch { showAlert("error", "Request failed"); }
    setSaving(false);
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Delete announcement "${a.title}"?`)) return;
    const r = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE", credentials: "include" });
    const d = await r.json();
    if (!r.ok) showAlert("error", d.error || "Failed");
    else { showAlert("success", "Deleted"); load(); }
  };

  const toggleActive = async (a: Announcement) => {
    const r = await fetch(`/api/admin/announcements/${a.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.is_active }) });
    const d = await r.json();
    if (!r.ok) showAlert("error", d.error || "Failed");
    else { load(); }
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
            <Megaphone className="h-5 w-5" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Announcements</h1>
          </div>
          <Button size="sm" onClick={openCreate} className="rounded-none gap-1 text-xs">
            <Plus className="h-3 w-3" />
            New
          </Button>
        </div>

        {alert && <Alert type={alert.type} msg={alert.msg} />}

        {/* Form */}
        {mode && (
          <form onSubmit={handleSubmit} className="border border-border p-4 sm:p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {mode === "create" ? "Create Announcement" : `Edit: ${editTarget?.title}`}
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="rounded-none text-sm" placeholder="Announcement title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Message</label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="rounded-none text-sm min-h-[80px]" placeholder="Announcement body..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Announcement["type"] })} className="w-full px-3 py-2 text-sm border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                  Active (visible to users)
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} size="sm" className="rounded-none text-xs">
                {saving ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-none text-xs" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No announcements yet</div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className={`border p-4 space-y-2 transition-opacity ${TYPE_COLORS[a.type]} ${!a.is_active ? "opacity-40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{a.title}</span>
                      <span className={`text-xs border px-1.5 py-0.5 ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                      {!a.is_active && <span className="text-xs border border-border text-muted-foreground px-1.5 py-0.5">Hidden</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.message}</p>
                    <div className="text-xs text-muted-foreground/60 mt-2">
                      Created {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title={a.is_active ? "Hide" : "Show"} onClick={() => toggleActive(a)}>
                      {a.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
