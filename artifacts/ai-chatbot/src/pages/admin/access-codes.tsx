import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Key, ArrowLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Code {
  id: number;
  code: string;
  badge: string | null;
  notes: string | null;
  is_active: boolean;
  used_by: number | null;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string;
}

function Alert({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`px-4 py-3 text-sm border ${type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-green-500/50 bg-green-500/10 text-green-400"}`}>
      {msg}
    </div>
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function AdminAccessCodes() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState({ code: "", badge: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadCodes = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/access-codes", { credentials: "include" });
    const d = await r.json();
    if (d.codes) setCodes(d.codes);
    setLoading(false);
  };

  useEffect(() => { loadCodes(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { showAlert("error", "Code is required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/access-codes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: form.code, badge: form.badge || undefined, notes: form.notes || undefined }) });
      const d = await r.json();
      if (!r.ok) showAlert("error", d.error || "Failed");
      else { showAlert("success", "Access code created"); setForm({ code: "", badge: "", notes: "" }); setShowForm(false); loadCodes(); }
    } catch { showAlert("error", "Request failed"); }
    setSaving(false);
  };

  const handleDelete = async (code: Code) => {
    if (!confirm(`Delete code "${code.code}"?`)) return;
    const r = await fetch(`/api/admin/access-codes/${code.id}`, { method: "DELETE", credentials: "include" });
    const d = await r.json();
    if (!r.ok) showAlert("error", d.error || "Failed");
    else { showAlert("success", "Code deleted"); loadCodes(); }
  };

  const total = codes.length;
  const available = codes.filter((c) => c.is_active && !c.used_by).length;
  const used = codes.filter((c) => c.used_by).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Key className="h-5 w-5" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Access Codes</h1>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="rounded-none gap-1 text-xs">
            <Plus className="h-3 w-3" />
            New Code
          </Button>
        </div>

        {alert && <Alert type={alert.type} msg={alert.msg} />}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: total },
            { label: "Available", value: available },
            { label: "Used", value: used },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border p-3 text-center">
              <div className="text-xl font-bold font-mono">{value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="border border-border p-4 sm:p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Create Access Code</h2>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Code</label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="XXXX-XXXX-XXXX"
                  className="rounded-none font-mono text-sm"
                  required
                />
                <Button type="button" variant="outline" size="icon" className="rounded-none shrink-0" onClick={() => setForm({ ...form, code: generateCode() })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Badge (optional)</label>
                <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Founder" className="rounded-none font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal note" className="rounded-none font-mono text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} size="sm" className="rounded-none text-xs">
                {saving ? "Creating..." : "Create Code"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-none text-xs" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Codes list */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No access codes yet</div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar">
                  {["Code", "Badge", "Status", "Used By", "Used At", "Created", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-sidebar-accent/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs bg-sidebar px-2 py-1 border border-border">{c.code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.badge ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {c.used_by ? (
                        <span className="text-xs border border-red-500/30 text-red-400 px-1.5 py-0.5">Used</span>
                      ) : c.is_active ? (
                        <span className="text-xs border border-green-500/30 text-green-400 px-1.5 py-0.5">Active</span>
                      ) : (
                        <span className="text-xs border border-border text-muted-foreground px-1.5 py-0.5">Inactive</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{c.used_by_email ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
