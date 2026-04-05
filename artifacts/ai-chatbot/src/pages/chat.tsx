import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useGetConversationMessages,
  getGetConversationMessagesQueryKey,
  useSendMessage,
  useCreateConversation,
  getListConversationsQueryKey,
  useListServers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Terminal, Globe, HardDrive, ChevronDown, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UploadedModel {
  id: number;
  name: string;
  file_name: string;
  format: string | null;
  file_size: number | null;
}

interface ServerConfig {
  id: number;
  name: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
}

type SourceMode = "server" | "local";

// ─── Source Picker ────────────────────────────────────────────────────────────

function SourcePicker({
  servers,
  models,
  mode,
  setMode,
  selectedServerId,
  setSelectedServerId,
  selectedModelId,
  setSelectedModelId,
}: {
  servers: ServerConfig[];
  models: UploadedModel[];
  mode: SourceMode;
  setMode: (m: SourceMode) => void;
  selectedServerId: number | null;
  setSelectedServerId: (id: number | null) => void;
  selectedModelId: number | null;
  setSelectedModelId: (id: number | null) => void;
}) {
  const remoteServers = servers.filter(s => !s.name.startsWith("[Model]"));
  const modelServerMap = new Map<string, number>();
  servers
    .filter(s => s.name.startsWith("[Model]"))
    .forEach(s => {
      const modelName = s.name.replace(/^\[Model\]\s*/, "");
      modelServerMap.set(modelName, s.id);
    });

  const selectedModel = models.find(m => m.id === selectedModelId) ?? null;
  const resolvedServerId = selectedModel
    ? (modelServerMap.get(selectedModel.name) ?? null)
    : null;
  const modelConfigured = selectedModel ? resolvedServerId !== null : true;

  return (
    <div className="w-full max-w-xl mx-auto mb-2 space-y-2">
      <div className="flex gap-0 border border-white/20 w-fit">
        <button
          type="button"
          onClick={() => setMode("server")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
            mode === "server"
              ? "bg-white text-black font-bold"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Globe className="h-3 w-3" /> AI Server
        </button>
        <button
          type="button"
          onClick={() => setMode("local")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors border-l border-white/20 ${
            mode === "local"
              ? "bg-white text-black font-bold"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <HardDrive className="h-3 w-3" /> Local Model
        </button>
      </div>

      {mode === "server" && (
        <div className="relative w-full max-w-xl">
          <select
            value={selectedServerId ?? ""}
            onChange={e => setSelectedServerId(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-8 text-xs bg-transparent border border-white/20 rounded-none px-3 pr-8 text-white appearance-none font-mono focus:outline-none focus:border-white"
          >
            <option value="" className="bg-black">— Use default server —</option>
            {remoteServers.map(s => (
              <option key={s.id} value={s.id} className="bg-black">
                {s.name}{s.isDefault ? " (default)" : ""} · {s.model}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
      )}

      {mode === "local" && (
        <div className="space-y-1.5 w-full max-w-xl">
          <div className="relative w-full">
            <select
              value={selectedModelId ?? ""}
              onChange={e => setSelectedModelId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-8 text-xs bg-transparent border border-white/20 rounded-none px-3 pr-8 text-white appearance-none font-mono focus:outline-none focus:border-white"
            >
              <option value="" className="bg-black">— Select a local model —</option>
              {models.map(m => (
                <option key={m.id} value={m.id} className="bg-black">
                  {m.name}{m.format ? ` [${m.format.toUpperCase()}]` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>

          {selectedModel && !modelConfigured && (
            <div className="flex items-center gap-2 text-[11px] text-yellow-500/80 border border-yellow-500/30 px-2.5 py-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              No inference server configured for this model. Open Connections → Models and click &quot;Use in Chat&quot;.
            </div>
          )}
          {selectedModel && modelConfigured && (
            <div className="text-[11px] text-green-400/70 font-mono px-0.5">
              ✓ Routed via server config
            </div>
          )}
          {models.length === 0 && (
            <div className="text-[11px] text-muted-foreground px-0.5">
              No models uploaded. Go to Connections → Models to upload one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat Area ────────────────────────────────────────────────────────────────

export function ChatArea() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const idStr = searchParams.get("id");
  const conversationId = idStr ? parseInt(idStr, 10) : null;

  const { data: serversData } = useListServers();
  const servers = (serversData ?? []) as ServerConfig[];

  const [models, setModels] = useState<UploadedModel[]>([]);
  useEffect(() => {
    fetch("/api/models", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setModels)
      .catch(() => {});
  }, []);

  const [sourceMode, setSourceMode] = useState<SourceMode>("server");
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const modelServerMap = new Map<string, number>();
  servers
    .filter(s => s.name.startsWith("[Model]"))
    .forEach(s => modelServerMap.set(s.name.replace(/^\[Model\]\s*/, ""), s.id));

  const resolvedServerId: number | null = (() => {
    if (sourceMode === "server") return selectedServerId;
    if (sourceMode === "local") {
      const model = models.find(m => m.id === selectedModelId);
      return model ? (modelServerMap.get(model.name) ?? null) : null;
    }
    return null;
  })();

  const { data: conversation, isLoading: isLoadingConv } = useGetConversation(
    conversationId as number,
    { query: { enabled: !!conversationId, queryKey: getGetConversationQueryKey(conversationId as number) } },
  );

  const { data: messages, isLoading: isLoadingMessages } = useGetConversationMessages(
    conversationId as number,
    { query: { enabled: !!conversationId, queryKey: getGetConversationMessagesQueryKey(conversationId as number) } },
  );

  const sendMessage = useSendMessage();
  const createConv = useCreateConversation();
  const [input, setInput] = useState("");
  const [homeInput, setHomeInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    const content = input;
    setInput("");
    sendMessage.mutate(
      { data: { conversationId, content } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(conversationId) }) },
    );
  };

  const handleHomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeInput.trim() || createConv.isPending) return;
    const content = homeInput;
    const title = content.length > 40 ? content.slice(0, 40) + "…" : content;
    setHomeInput("");

    const serverIdPayload = resolvedServerId ?? undefined;

    createConv.mutate(
      { data: { title, serverId: serverIdPayload } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          sendMessage.mutate(
            { data: { conversationId: conv.id, content, serverId: serverIdPayload } },
            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(conv.id) }) },
          );
          setLocation(`/?id=${conv.id}`);
        },
      },
    );
  };

  const activeServerName = (() => {
    if (!conversation?.serverId) {
      const def = servers.find(s => s.isDefault);
      return def ? def.name : null;
    }
    return servers.find(s => s.id === conversation.serverId)?.name ?? null;
  })();

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col px-4 pb-6">
        <div className="flex-1" />
        <SourcePicker
          servers={servers}
          models={models}
          mode={sourceMode}
          setMode={setSourceMode}
          selectedServerId={selectedServerId}
          setSelectedServerId={setSelectedServerId}
          selectedModelId={selectedModelId}
          setSelectedModelId={setSelectedModelId}
        />
        <form onSubmit={handleHomeSubmit} className="flex gap-2 w-full max-w-xl mx-auto">
          <Input
            data-testid="input-home-message"
            value={homeInput}
            onChange={(e) => setHomeInput(e.target.value)}
            placeholder="Enter message..."
            className="flex-1 border-border font-mono rounded-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 bg-[#26262600] pt-[5px] text-sm border-t-[#ffffff] border-r-[#ffffff] border-b-[#ffffff] border-l-[#ffffff] pb-[5px] mt-[10px] mb-[10px] rounded-tl-[10px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px]"
            disabled={createConv.isPending || sendMessage.isPending}
            autoFocus
          />
          <Button
            data-testid="button-home-send"
            type="submit"
            disabled={!homeInput.trim() || createConv.isPending || sendMessage.isPending}
            className="rounded-none border-t-[#ffffff] border-r-[#ffffff] border-b-[#ffffff] border-l-[#ffffff] bg-[#ffffff00] text-[#ffffff] shrink-0 px-3 sm:px-4 pt-[8px] pb-[8px] pl-[16px] pr-[16px] mt-[10px] mb-[10px] rounded-tl-[10px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px]"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">EXEC</span>
          </Button>
        </form>
      </div>
    );
  }

  if (isLoadingConv || isLoadingMessages) {
    return <div className="flex-1 flex items-center justify-center text-sm">Loading...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full relative min-h-0">
      <div className="px-3 py-2 sm:p-4 border-b border-border bg-background/95 backdrop-blur z-10 sticky top-0 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold flex items-center gap-2 text-sm sm:text-base truncate">
            <Terminal className="h-4 w-4 shrink-0" />
            {conversation?.title || "Chat"}
          </h2>
          {activeServerName && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono shrink-0 border border-border/50 px-2 py-0.5">
              {activeServerName.startsWith("[Model]") ? (
                <HardDrive className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              <span className="hidden sm:inline truncate max-w-[160px]">
                {activeServerName.replace(/^\[Model\]\s*/, "")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 min-h-0">
        {messages?.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-none border ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground border-border"
            }`}>
              <div className="text-xs opacity-50 mb-1 flex items-center gap-1 uppercase tracking-wider">
                {msg.role === "user" ? "> user" : "> assistant"}
              </div>
              <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed break-words">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[90%] sm:max-w-[80%] p-2.5 sm:p-3 bg-card border border-border text-card-foreground">
              <div className="text-xs opacity-50 mb-1 flex items-center gap-1 uppercase tracking-wider">
                {">"} assistant
              </div>
              <div className="animate-pulse text-sm">Processing...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2 sm:p-4 border-t border-border bg-background shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 bg-input border-border font-mono rounded-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 text-sm"
            disabled={sendMessage.isPending}
          />
          <Button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            className="rounded-none shrink-0 px-3 sm:px-4"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
