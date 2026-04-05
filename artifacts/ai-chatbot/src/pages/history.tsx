import { useListConversations, useDeleteConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MessageSquare, Trash2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HistoryPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListConversations();
  const deleteConv = useDeleteConversation();

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    deleteConv.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }) }
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Conversation History</h1>
          </div>
          <Button size="sm" className="rounded-none gap-1 text-xs" onClick={() => setLocation("/")}>
            <Plus className="h-3 w-3" />
            New Chat
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-20" />
            <div className="text-center space-y-1">
              <p className="text-sm uppercase tracking-widest">No Conversations Yet</p>
              <p className="text-xs opacity-60">Start a new chat from the home screen.</p>
            </div>
            <Button size="sm" className="rounded-none text-xs mt-2" onClick={() => setLocation("/")}>
              Go to Home
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/?id=${conv.id}`}
                className="group border border-border p-4 hover:bg-sidebar-accent transition-colors flex flex-col gap-3 relative"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 opacity-40 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate leading-tight">
                      {conv.title || "Untitled Chat"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-muted-foreground">
                    {conv.createdAt
                      ? new Date(conv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deleteConv.isPending}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
