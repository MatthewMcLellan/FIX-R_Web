import { useState, useEffect, useRef } from "react";
import {
  useListServers,
  useCreateServer,
  useDeleteServer,
  getListServersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Server, Trash2, Plus, Plug, Eye, EyeOff, Copy, Check, ToggleLeft, ToggleRight, Cpu, RefreshCw, Zap, Pencil, Upload, HardDrive, FileCode2, X, Database, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppConnection {
  id: number;
  name: string;
  api_key: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface NewCredentials {
  apiKey: string;
  secret: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Alert({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`px-4 py-3 text-sm border ${type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-green-500/50 bg-green-500/10 text-green-400"}`}>
      {msg}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── App Connections Tab ──────────────────────────────────────────────────────

function AppConnectionsTab() {
  const [apps, setApps] = useState<AppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [form, setForm] = useState({ name: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [newCreds, setNewCreds] = useState<NewCredentials | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 6000);
  };

  const loadApps = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/app-connections", { credentials: "include" });
      const d = await r.json();
      if (d.apps) setApps(d.apps);
    } catch {
      showAlert("error", "Failed to load app connections");
    }
    setLoading(false);
  };

  useEffect(() => { loadApps(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/app-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name.trim(), notes: form.notes || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { showAlert("error", d.error || "Failed to create app"); setSaving(false); return; }
      setNewCreds({ apiKey: d.apiKey, secret: d.secret });
      setForm({ name: "", notes: "" });
      await loadApps();
    } catch {
      showAlert("error", "Failed to create app connection");
    }
    setSaving(false);
  };

  const handleToggle = async (id: number) => {
    try {
      await fetch(`/api/admin/app-connections/${id}/toggle`, { method: "PUT", credentials: "include" });
      await loadApps();
    } catch {
      showAlert("error", "Failed to toggle app");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this app connection? Its API credentials will stop working.")) return;
    try {
      const r = await fetch(`/api/admin/app-connections/${id}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!r.ok) { showAlert("error", d.error || "Failed to delete app"); return; }
      showAlert("success", "App connection deleted");
      await loadApps();
    } catch {
      showAlert("error", "Failed to delete app");
    }
  };

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} msg={alert.msg} />}

      {newCreds && (
        <div className="border border-green-500/50 bg-green-500/10 p-4 space-y-3">
          <p className="text-sm text-green-400 font-bold uppercase tracking-wider">App created — save these credentials now. The secret will not be shown again.</p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 bg-black/30 px-3 py-2">
              <span className="opacity-50 shrink-0">API KEY</span>
              <span className="flex-1 truncate">{newCreds.apiKey}</span>
              <CopyButton value={newCreds.apiKey} />
            </div>
            <div className="flex items-center gap-2 bg-black/30 px-3 py-2">
              <span className="opacity-50 shrink-0">SECRET</span>
              <span className="flex-1 truncate">{newCreds.secret}</span>
              <CopyButton value={newCreds.secret} />
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-none text-xs" onClick={() => setNewCreds(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-border bg-card p-6 rounded-none">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-border pb-2">Register App</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>App Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. iOS Client"
                required
                className="rounded-none bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Usage notes or description..."
                className="rounded-none bg-input resize-none text-sm min-h-[80px]"
              />
            </div>
            <Button type="submit" disabled={saving || !form.name.trim()} className="w-full rounded-none mt-2">
              <Plus className="h-4 w-4 mr-2" /> Create App Connection
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2">Registered Apps</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 bg-muted animate-pulse" />
              <div className="h-20 bg-muted animate-pulse" />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-muted-foreground p-4 border border-border border-dashed text-center text-sm">
              No apps registered yet.
            </div>
          ) : (
            apps.map(app => (
              <div key={app.id} className="border border-border bg-card p-4 rounded-none">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{app.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 uppercase tracking-wider ${app.is_active ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
                      {app.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none"
                      onClick={() => handleToggle(app.id)}
                      title={app.is_active ? "Disable" : "Enable"}
                    >
                      {app.is_active ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4 opacity-50" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-none"
                      onClick={() => handleDelete(app.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="opacity-50 w-16 shrink-0">API KEY</span>
                    <span className="truncate">{app.api_key}</span>
                    <CopyButton value={app.api_key} />
                  </div>
                  {app.notes && (
                    <div className="flex items-start gap-1 mt-1">
                      <span className="opacity-50 w-16 shrink-0">NOTES</span>
                      <span className="text-muted-foreground font-sans">{app.notes}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 opacity-50">
                    <span className="w-16 shrink-0">CREATED</span>
                    <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    {app.last_used_at && (
                      <span className="ml-2">· Last used {new Date(app.last_used_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Servers Tab ──────────────────────────────────────────────────────────────

interface EditForm { name: string; baseUrl: string; model: string; apiKey: string; isDefault: boolean; }

function ServersTab() {
  const queryClient = useQueryClient();
  const { data: servers, isLoading } = useListServers();
  const createServer = useCreateServer();
  const deleteServer = useDeleteServer();

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", baseUrl: "", model: "", apiKey: "", isDefault: false });
  const [saving, setSaving] = useState(false);

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !baseUrl || !model) return;
    createServer.mutate(
      { data: { name, baseUrl, model, apiKey, isDefault } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
          setName(""); setBaseUrl(""); setModel(""); setApiKey(""); setIsDefault(false);
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteServer.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
        if (editingId === id) setEditingId(null);
      }
    });
  };

  const startEdit = (server: { id: number; name: string; baseUrl: string; model: string; isDefault: boolean }) => {
    setEditingId(server.id);
    setEditForm({ name: server.name, baseUrl: server.baseUrl, model: server.model, apiKey: "", isDefault: server.isDefault });
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`/api/chat/servers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editForm.name,
          baseUrl: editForm.baseUrl,
          model: editForm.model,
          apiKey: editForm.apiKey || undefined,
          isDefault: editForm.isDefault,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
      setEditingId(null);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border border-border bg-card p-6 rounded-none">
        <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-border pb-2">Add Endpoint</h2>
        <form onSubmit={handleAddServer} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Local Llama" required className="rounded-none bg-input" />
          </div>
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" required className="rounded-none bg-input" />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" required className="rounded-none bg-input" />
          </div>
          <div className="space-y-2">
            <Label>API Key (Optional)</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="..." className="rounded-none bg-input" />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isDefault" checked={isDefault} onCheckedChange={(c) => setIsDefault(c as boolean)} className="rounded-none" />
            <Label htmlFor="isDefault">Set as default</Label>
          </div>
          <Button type="submit" disabled={createServer.isPending} className="w-full rounded-none mt-2">
            <Plus className="h-4 w-4 mr-2" /> Add Server
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2">Active Endpoints</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted" />
            <div className="h-20 bg-muted" />
          </div>
        ) : servers?.length === 0 ? (
          <div className="text-muted-foreground p-4 border border-border border-dashed text-center">
            No servers configured.
          </div>
        ) : (
          servers?.map(server => (
            <div key={server.id} className="border border-border bg-card rounded-none">
              {editingId === server.id ? (
                <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-3">
                    Editing: {server.name}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required className="rounded-none bg-input text-sm h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Base URL</Label>
                    <Input value={editForm.baseUrl} onChange={e => setEditForm(f => ({ ...f, baseUrl: e.target.value }))} required className="rounded-none bg-input text-sm h-8 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input value={editForm.model} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} required className="rounded-none bg-input text-sm h-8 font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">API Key (leave blank to keep existing)</Label>
                    <Input type="password" value={editForm.apiKey} onChange={e => setEditForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="••••••••" className="rounded-none bg-input text-sm h-8" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id={`edit-default-${server.id}`} checked={editForm.isDefault} onCheckedChange={c => setEditForm(f => ({ ...f, isDefault: c as boolean }))} className="rounded-none" />
                    <Label htmlFor={`edit-default-${server.id}`} className="text-xs">Set as default</Label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" disabled={saving} className="rounded-none flex-1">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={cancelEdit} className="rounded-none">
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{server.name}</span>
                      {server.isDefault && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 uppercase tracking-wider">Default</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono space-y-1">
                      <div><span className="opacity-50">URL:</span> {server.baseUrl}</div>
                      <div><span className="opacity-50">MDL:</span> {server.model}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(server)} className="rounded-none h-8 w-8" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(server.id)} disabled={deleteServer.isPending} className="rounded-none h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── LM Studio Tab ───────────────────────────────────────────────────────────

function LmStudioTab() {
  const queryClient = useQueryClient();
  const createServer = useCreateServer();

  const [secretUrl, setSecretUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [probing, setProbing] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [resolvedBase, setResolvedBase] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 6000);
  };

  useEffect(() => {
    fetch("/api/lmstudio/config", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.url) {
          setSecretUrl(d.url);
          setUrl(d.url);
        }
      })
      .catch(() => {});
  }, []);

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setProbing(true);
    setModels([]);
    setResolvedBase("");
    try {
      const r = await fetch("/api/lmstudio/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { showAlert("error", d.error || "Failed to reach LM Studio"); setProbing(false); return; }
      setModels(d.models);
      setResolvedBase(d.baseUrl);
      if (d.models.length === 0) showAlert("error", "Connected but no models loaded in LM Studio.");
    } catch {
      showAlert("error", "Failed to reach the server.");
    }
    setProbing(false);
  };

  const handleAddModel = (model: string) => {
    setAdding(model);
    createServer.mutate(
      { data: { name: `LM Studio — ${model}`, baseUrl: resolvedBase, model, apiKey: "", isDefault: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
          showAlert("success", `"${model}" added to your server configs.`);
          setAdding(null);
        },
        onError: () => {
          showAlert("error", "Failed to add server.");
          setAdding(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {alert && <Alert type={alert.type} msg={alert.msg} />}

      {secretUrl && (
        <div className="flex items-center gap-2 px-3 py-2 border border-green-500/30 bg-green-500/5 text-xs text-green-400 font-mono">
          <Zap className="h-3 w-3 shrink-0" />
          LM_STUDIO_URL secret detected — pre-filled below
        </div>
      )}

      <div className="border border-border bg-card p-6 rounded-none space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          LM Studio / ngrok Endpoint
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your ngrok URL or local LM Studio address. The server will connect and list available models.
        </p>

        <form onSubmit={handleProbe} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx.ngrok.io  or  http://localhost:1234"
            className="flex-1 rounded-none bg-input font-mono text-sm"
            disabled={probing}
          />
          <Button type="submit" disabled={probing || !url.trim()} className="rounded-none shrink-0">
            {probing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground opacity-60">
          Make sure LM Studio's local server is running (port 1234 by default). For remote access, paste the full ngrok URL.
        </p>
      </div>

      {models.length > 0 && (
        <div className="border border-border bg-card p-6 rounded-none space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider border-b border-border pb-2">
            {models.length} Model{models.length !== 1 ? "s" : ""} Found
          </h3>
          <div className="text-xs text-muted-foreground font-mono mb-2 opacity-60">{resolvedBase}</div>
          {models.map(model => (
            <div key={model} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
              <span className="font-mono text-sm truncate">{model}</span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none shrink-0 text-xs"
                disabled={adding === model}
                onClick={() => handleAddModel(model)}
              >
                {adding === model ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add</>}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Models Tab ───────────────────────────────────────────────────────────────

interface UploadedModel {
  id: number;
  name: string;
  description: string | null;
  file_name: string;
  object_path: string;
  file_size: number | null;
  format: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface AddServerForm { baseUrl: string; apiKey: string; }

function formatBytes(n: number | null) {
  if (!n) return "?";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function ModelsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<UploadedModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [addServerModelId, setAddServerModelId] = useState<number | null>(null);
  const [addServerForm, setAddServerForm] = useState<AddServerForm>({ baseUrl: "", apiKey: "" });
  const [addServerMsg, setAddServerMsg] = useState<string | null>(null);
  const [addingServer, setAddingServer] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch("/api/models", { credentials: "include" });
      if (res.ok) setModels(await res.json());
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (f && !modelName) setModelName(f.name.replace(/\.[^/.]+$/, ""));
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !modelName.trim()) return;
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const objectPath = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/models/upload");
        xhr.withCredentials = true;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 90));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).objectPath); }
            catch { reject(new Error("Invalid server response")); }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed")); }
            catch { reject(new Error(`Upload failed (${xhr.status})`)); }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });

      setProgress(95);
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
      const registerRes = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: modelName.trim(),
          description: modelDescription.trim() || null,
          fileName: selectedFile.name,
          objectPath,
          fileSize: selectedFile.size,
          format: ext,
        }),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        setUploadError(err.error || "Failed to register model");
        return;
      }

      setProgress(100);
      setUploadSuccess(`"${modelName}" uploaded successfully.`);
      setModelName(""); setModelDescription(""); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchModels();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await fetch(`/api/models/${id}`, { method: "DELETE", credentials: "include" });
    setDeletingId(null);
    setModels(ms => ms.filter(m => m.id !== id));
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addServerModelId || !addServerForm.baseUrl.trim()) return;
    setAddingServer(true);
    setAddServerMsg(null);
    try {
      const res = await fetch(`/api/models/${addServerModelId}/add-server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ baseUrl: addServerForm.baseUrl.trim(), apiKey: addServerForm.apiKey || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setAddServerMsg(`Error: ${data.error}`); return; }
      setAddServerMsg(data.updated ? "Server config updated." : "Server config created — check the Server Configurations tab.");
      setAddServerForm({ baseUrl: "", apiKey: "" });
    } catch {
      setAddServerMsg("Request failed.");
    } finally {
      setAddingServer(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-border bg-card p-6 rounded-none">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Model File
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Model Name</Label>
              <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Llama 3.2 8B Q4" required className="rounded-none bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea value={modelDescription} onChange={e => setModelDescription(e.target.value)} placeholder="Quantization, context length, notes..." className="rounded-none bg-input text-sm min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label>Model File</Label>
              <div
                className="border border-border border-dashed p-6 text-center cursor-pointer hover:border-white transition-colors rounded-none"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="space-y-1">
                    <FileCode2 className="h-6 w-6 mx-auto text-white" />
                    <p className="text-sm font-mono">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <HardDrive className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select model file</p>
                    <p className="text-xs text-muted-foreground opacity-60">GGUF, ONNX, BIN, etc.</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".gguf,.onnx,.bin,.pt,.safetensors,.ggml" />
              </div>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span><span>{progress}%</span>
                </div>
                <div className="h-1 bg-muted rounded-none overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {uploadError && <Alert type="error" msg={uploadError} />}
            {uploadSuccess && <Alert type="success" msg={uploadSuccess} />}

            <Button type="submit" disabled={isUploading || !selectedFile} className="w-full rounded-none">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Model"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Stored Models
          </h2>

          {loadingModels ? (
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-muted" /><div className="h-20 bg-muted" />
            </div>
          ) : models.length === 0 ? (
            <div className="text-muted-foreground p-4 border border-border border-dashed text-center text-sm">
              No models uploaded yet.
            </div>
          ) : (
            models.map(m => (
              <div key={m.id} className="border border-border bg-card rounded-none">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{m.name}</div>
                      {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                      <div className="text-xs text-muted-foreground font-mono mt-1 space-y-0.5">
                        <div><span className="opacity-50">FILE:</span> {m.file_name}</div>
                        <div className="flex gap-4">
                          {m.format && <span><span className="opacity-50">FMT:</span> {m.format.toUpperCase()}</span>}
                          <span><span className="opacity-50">SIZE:</span> {formatBytes(m.file_size)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive" size="icon"
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="rounded-none h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {addServerModelId === m.id ? (
                    <form onSubmit={handleAddServer} className="mt-3 pt-3 border-t border-border space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Configure inference server</p>
                      <Input
                        value={addServerForm.baseUrl}
                        onChange={e => setAddServerForm(f => ({ ...f, baseUrl: e.target.value }))}
                        placeholder="http://localhost:1234/v1"
                        required
                        className="rounded-none bg-input text-sm h-8 font-mono"
                      />
                      <Input
                        type="password"
                        value={addServerForm.apiKey}
                        onChange={e => setAddServerForm(f => ({ ...f, apiKey: e.target.value }))}
                        placeholder="API key (optional)"
                        className="rounded-none bg-input text-sm h-8"
                      />
                      {addServerMsg && (
                        <div className={`text-xs px-3 py-2 border ${addServerMsg.startsWith("Error") ? "border-destructive/50 text-destructive" : "border-green-500/50 text-green-400"}`}>
                          {addServerMsg}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={addingServer} className="rounded-none flex-1 text-xs">
                          {addingServer ? "Saving..." : "Create Server Config"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setAddServerModelId(null); setAddServerMsg(null); }} className="rounded-none text-xs">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      size="sm" variant="outline"
                      className="mt-2 rounded-none text-xs w-full"
                      onClick={() => { setAddServerModelId(m.id); setAddServerMsg(null); setAddServerForm({ baseUrl: "", apiKey: "" }); }}
                    >
                      <Server className="h-3 w-3 mr-1" /> Use in Chat
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border border-border border-dashed p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-bold uppercase tracking-wider text-white/60 mb-2">How it works</p>
        <p>1. Upload your model file (GGUF, ONNX, etc.) — it's stored securely in object storage.</p>
        <p>2. Load the model in an inference server (LM Studio, llama.cpp, Ollama, etc.) using the same file.</p>
        <p>3. Click <span className="text-white">"Use in Chat"</span> and enter the inference server URL to register it as a chat endpoint.</p>
      </div>
    </div>
  );
}

// ─── Object Storage Tab (Admin Only) ─────────────────────────────────────────

const PROVIDERS = [
  { value: "s3", label: "AWS S3" },
  { value: "r2", label: "Cloudflare R2" },
  { value: "b2", label: "Backblaze B2" },
  { value: "gcs", label: "Google Cloud Storage" },
  { value: "minio", label: "MinIO / S3-Compatible" },
  { value: "other", label: "Other (S3-Compatible)" },
];

interface ObjStorageConfig {
  id: number;
  name: string;
  provider: string;
  endpoint: string | null;
  bucket: string;
  region: string | null;
  access_key_id: string | null;
  secret_access_key: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface ObjStorageForm {
  name: string; provider: string; endpoint: string;
  bucket: string; region: string; access_key_id: string;
  secret_access_key: string; notes: string;
}

const blankForm = (): ObjStorageForm => ({
  name: "", provider: "s3", endpoint: "", bucket: "",
  region: "", access_key_id: "", secret_access_key: "", notes: "",
});

function providerLabel(p: string) {
  return PROVIDERS.find(x => x.value === p)?.label ?? p.toUpperCase();
}

function ObjStorageAddForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<ObjStorageForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof ObjStorageForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const needsEndpoint = ["r2", "b2", "minio", "other"].includes(form.provider);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/admin/object-storage", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, provider: form.provider,
          endpoint: form.endpoint || null, bucket: form.bucket,
          region: form.region || null, access_key_id: form.access_key_id || null,
          secret_access_key: form.secret_access_key || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Failed"); return; }
      setForm(blankForm());
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-card p-6 rounded-none space-y-4">
      <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
        <Plus className="h-4 w-4" /> Add Storage Backend
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Display Name</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Production Bucket" required className="rounded-none bg-input h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Provider</Label>
          <select value={form.provider} onChange={e => set("provider", e.target.value)} className="w-full h-8 text-sm bg-input border border-input rounded-none px-2 text-white">
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bucket Name</Label>
          <Input value={form.bucket} onChange={e => set("bucket", e.target.value)} placeholder="my-bucket" required className="rounded-none bg-input h-8 text-sm font-mono" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Region</Label>
          <Input value={form.region} onChange={e => set("region", e.target.value)} placeholder="us-east-1" className="rounded-none bg-input h-8 text-sm font-mono" />
        </div>
        {needsEndpoint && (
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Endpoint URL</Label>
            <Input value={form.endpoint} onChange={e => set("endpoint", e.target.value)} placeholder="https://s3.us-west-004.backblazeb2.com" className="rounded-none bg-input h-8 text-sm font-mono" />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Access Key ID</Label>
          <Input value={form.access_key_id} onChange={e => set("access_key_id", e.target.value)} placeholder="AKIAIOSFODNN7..." className="rounded-none bg-input h-8 text-sm font-mono" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Secret Access Key</Label>
          <Input type="password" value={form.secret_access_key} onChange={e => set("secret_access_key", e.target.value)} placeholder="••••••••••••••••" className="rounded-none bg-input h-8 text-sm" />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Notes (Optional)</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Region, purpose, ACL policy..." className="rounded-none bg-input text-sm min-h-[52px]" />
        </div>
      </div>
      {err && <Alert type="error" msg={err} />}
      <Button type="submit" disabled={saving} className="w-full rounded-none">
        <Plus className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Add Storage Config"}
      </Button>
    </form>
  );
}

function ObjStorageCard({ cfg, onRefresh }: { cfg: ObjStorageConfig; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ObjStorageForm>({
    name: cfg.name, provider: cfg.provider, endpoint: cfg.endpoint ?? "",
    bucket: cfg.bucket, region: cfg.region ?? "", access_key_id: cfg.access_key_id ?? "",
    secret_access_key: "", notes: cfg.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const set = (k: keyof ObjStorageForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const needsEndpoint = ["r2", "b2", "minio", "other"].includes(form.provider);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/object-storage/${cfg.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, provider: form.provider,
          endpoint: form.endpoint || null, bucket: form.bucket,
          region: form.region || null, access_key_id: form.access_key_id || null,
          secret_access_key: form.secret_access_key || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setMsg(`Error: ${d.error}`); return; }
      setEditing(false); onRefresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${cfg.name}"?`)) return;
    await fetch(`/api/admin/object-storage/${cfg.id}`, { method: "DELETE", credentials: "include" });
    onRefresh();
  };

  const handleSetActive = async () => {
    await fetch(`/api/admin/object-storage/${cfg.id}/set-active`, { method: "PUT", credentials: "include" });
    onRefresh();
  };

  return (
    <div className={`border rounded-none ${cfg.is_active ? "border-white" : "border-border"} bg-card`}>
      {editing ? (
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-3 flex justify-between">
            <span>Editing: {cfg.name}</span>
            <button type="button" onClick={() => setEditing(false)} className="hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Display Name</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} required className="rounded-none bg-input h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <select value={form.provider} onChange={e => set("provider", e.target.value)} className="w-full h-8 text-sm bg-input border border-input rounded-none px-2 text-white">
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bucket</Label>
              <Input value={form.bucket} onChange={e => set("bucket", e.target.value)} required className="rounded-none bg-input h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Region</Label>
              <Input value={form.region} onChange={e => set("region", e.target.value)} className="rounded-none bg-input h-8 text-sm font-mono" />
            </div>
            {needsEndpoint && (
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Endpoint URL</Label>
                <Input value={form.endpoint} onChange={e => set("endpoint", e.target.value)} className="rounded-none bg-input h-8 text-sm font-mono" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Access Key ID</Label>
              <Input value={form.access_key_id} onChange={e => set("access_key_id", e.target.value)} className="rounded-none bg-input h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secret Key (blank = keep existing)</Label>
              <Input type="password" value={form.secret_access_key} onChange={e => set("secret_access_key", e.target.value)} placeholder="••••••••" className="rounded-none bg-input h-8 text-sm" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="rounded-none bg-input text-sm min-h-[48px]" />
            </div>
          </div>
          {msg && <div className={`text-xs px-3 py-2 border ${msg.startsWith("Error") ? "border-destructive/50 text-destructive" : "border-green-500/50 text-green-400"}`}>{msg}</div>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="rounded-none flex-1 text-xs">{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} className="rounded-none text-xs">Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold">{cfg.name}</span>
                <span className="text-[10px] border border-border px-1.5 py-0.5 uppercase tracking-wider text-muted-foreground">{providerLabel(cfg.provider)}</span>
                {cfg.is_active && <span className="text-[10px] bg-white text-black px-1.5 py-0.5 uppercase tracking-wider font-bold">Active</span>}
              </div>
              <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                <div><span className="opacity-50">BKT:</span> {cfg.bucket}</div>
                {cfg.region && <div><span className="opacity-50">RGN:</span> {cfg.region}</div>}
                {cfg.endpoint && <div><span className="opacity-50">URL:</span> {cfg.endpoint}</div>}
                {cfg.access_key_id && <div><span className="opacity-50">KEY:</span> {cfg.access_key_id}</div>}
                {cfg.secret_access_key && <div><span className="opacity-50">SEC:</span> {cfg.secret_access_key}</div>}
              </div>
              {cfg.notes && (
                <button onClick={() => setShowNotes(n => !n)} className="mt-1 text-xs text-muted-foreground flex items-center gap-1 hover:text-white">
                  {showNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Notes
                </button>
              )}
              {cfg.notes && showNotes && (
                <div className="mt-1 text-xs text-muted-foreground border-l border-border pl-2">{cfg.notes}</div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="rounded-none h-8 w-8" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} className="rounded-none h-8 w-8" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {!cfg.is_active && (
            <Button size="sm" variant="outline" onClick={handleSetActive} className="mt-2 rounded-none text-xs w-full">
              Set as Active
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectStorageTab() {
  const [configs, setConfigs] = useState<ObjStorageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/object-storage", { credentials: "include" });
      if (res.ok) setConfigs(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const active = configs.find(c => c.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border/50 border-dashed px-4 py-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-yellow-500/70" />
        <span>Admin only. Credentials are stored in the database. Secret keys are masked after entry.</span>
      </div>

      {active && (
        <div className="border border-white/20 bg-white/5 px-4 py-3 text-sm flex items-center gap-3">
          <Database className="h-4 w-4 text-white shrink-0" />
          <div>
            <span className="font-bold text-white">{active.name}</span>
            <span className="text-muted-foreground ml-2">is the active storage backend</span>
            <span className="ml-2 text-xs font-mono text-muted-foreground">({providerLabel(active.provider)} / {active.bucket})</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ObjStorageAddForm onSaved={fetchConfigs} />

        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Database className="h-4 w-4" /> Configured Backends
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-3"><div className="h-24 bg-muted" /><div className="h-24 bg-muted" /></div>
          ) : configs.length === 0 ? (
            <div className="text-muted-foreground p-4 border border-border border-dashed text-center text-sm">No storage backends configured.</div>
          ) : (
            configs.map(cfg => <ObjStorageCard key={cfg.id} cfg={cfg} onRefresh={fetchConfigs} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "servers" | "apps" | "lmstudio" | "models" | "objstorage";

export function ServersPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [tab, setTab] = useState<Tab>("servers");

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "servers", label: "Server Configurations", icon: <Server className="h-4 w-4" /> },
    { id: "apps", label: "App Connections", icon: <Plug className="h-4 w-4" /> },
    { id: "lmstudio", label: "LM Studio", icon: <Cpu className="h-4 w-4" /> },
    { id: "models", label: "Models", icon: <HardDrive className="h-4 w-4" /> },
    { id: "objstorage", label: "Object Storage", icon: <Database className="h-4 w-4" />, adminOnly: true },
  ];

  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 uppercase tracking-wider">
          <Server className="h-5 w-5" />
          Connections
        </h1>
        <p className="text-muted-foreground">Manage AI server endpoints and registered app credentials.</p>
      </div>

      <div className="flex gap-0 border-b border-border flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-white text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "servers" && <ServersTab />}
      {tab === "apps" && <AppConnectionsTab />}
      {tab === "lmstudio" && <LmStudioTab />}
      {tab === "models" && <ModelsTab />}
      {tab === "objstorage" && isAdmin && <ObjectStorageTab />}
    </div>
  );
}
