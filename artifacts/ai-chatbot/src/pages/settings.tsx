import { useGetChatStats, useHealthCheck } from "@workspace/api-client-react";
import { Activity, MessageSquare, Database, Hash } from "lucide-react";

export function SettingsPage() {
  const { data: stats, isLoading: statsLoading } = useGetChatStats();
  const { data: health, isLoading: healthLoading } = useHealthCheck();

  return (
    <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 uppercase tracking-wider">
          <Activity className="h-5 w-5" />
          System Settings
        </h1>
        <p className="text-muted-foreground">Overview and global statistics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-border bg-card p-4 rounded-none space-y-2">
          <div className="text-muted-foreground text-xs uppercase flex items-center gap-2">
            <MessageSquare className="h-3 w-3" /> Total Conv.
          </div>
          <div className="text-2xl font-bold">
            {statsLoading ? "-" : stats?.totalConversations}
          </div>
        </div>
        <div className="border border-border bg-card p-4 rounded-none space-y-2">
          <div className="text-muted-foreground text-xs uppercase flex items-center gap-2">
            <Database className="h-3 w-3" /> Total Msg.
          </div>
          <div className="text-2xl font-bold">
            {statsLoading ? "-" : stats?.totalMessages}
          </div>
        </div>
        <div className="border border-border bg-card p-4 rounded-none space-y-2">
          <div className="text-muted-foreground text-xs uppercase flex items-center gap-2">
            <Hash className="h-3 w-3" /> Msg. This Week
          </div>
          <div className="text-2xl font-bold text-primary">
            {statsLoading ? "-" : stats?.messagesThisWeek}
          </div>
        </div>
        <div className="border border-border bg-card p-4 rounded-none space-y-2">
          <div className="text-muted-foreground text-xs uppercase flex items-center gap-2">
            <Activity className="h-3 w-3" /> Active Servers
          </div>
          <div className="text-2xl font-bold">
            {statsLoading ? "-" : stats?.activeServers}
          </div>
        </div>
      </div>

      <div className="border border-border p-6 mt-8">
        <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-border pb-2">System Status</h2>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${healthLoading ? 'bg-muted' : health?.status === 'ok' ? 'bg-primary' : 'bg-destructive'}`}></div>
          <span className="font-mono text-sm">API Backend: {healthLoading ? "CHECKING..." : health?.status?.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
