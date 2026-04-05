import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListConversations, useCreateConversation, useDeleteConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Plus, MessageSquare, Settings, Server, Trash2, Menu, X, Home, History as HistoryIcon, User, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import fixrBg from "@assets/FIX-R3_1775331489750.png";
import logoImg from "@assets/FIX-R copy.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, authenticated, loading: authLoading, refetch: refetchAuth } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await refetchAuth();
    setLocation("/login");
  };

  const { data: conversations, isLoading } = useListConversations();
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

  const handleNewChat = () => {
    createConv.mutate(
      { data: { title: "New Chat" } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setLocation(`/?id=${conv.id}`);
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    deleteConv.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          if (location === `/?id=${id}`) {
            setLocation("/");
          }
        }
      }
    );
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/history", label: "History", icon: HistoryIcon },
    { href: "/servers", label: "Servers", icon: Server },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/account", label: "Account", icon: User },
    ...(user?.isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  const ConvList = ({ onNav }: { onNav?: () => void }) => (
    <>
      {isLoading ? (
        <div className="px-2 py-1 text-sm text-muted-foreground">Loading...</div>
      ) : (
        conversations?.map((conv) => (
          <Link
            key={conv.id}
            href={`/?id=${conv.id}`}
            onClick={onNav}
            className={`flex items-center justify-between group px-2 py-1.5 text-sm rounded-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${
              location === `/?id=${conv.id}` ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <MessageSquare className="h-3 w-3 opacity-50 shrink-0" />
              <span className="truncate">{conv.title}</span>
            </div>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              disabled={deleteConv.isPending}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Link>
        ))
      )}
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-mono overflow-hidden">
      {/* Overlay backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}
      {/* Slide-out nav drawer (all screen sizes) */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <img src={logoImg} alt="FIX-R" className="h-8 w-auto" style={{ mixBlendMode: "screen" }} />
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-2 border-b border-border space-y-1 shrink-0">
          <div className="text-xs text-muted-foreground px-2 py-1 mb-1 font-bold uppercase tracking-wider">Navigate</div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-2 py-2 text-sm rounded-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${
                location === href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4 opacity-60 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
              <HistoryIcon className="h-3 w-3" />
              History
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleNewChat} disabled={createConv.isPending}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <ConvList onNav={() => setMenuOpen(false)} />
        </div>
      </div>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-56 lg:w-64 border-r border-border flex-col bg-sidebar shrink-0">
        <div className="p-3 lg:p-4 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            className="shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Link href="/" className="block">
            <img src={logoImg} alt="FIX-R" className="h-7 lg:h-8 w-auto ml-[0px] mr-[0px] pl-[0px] pr-[40px]" style={{ mixBlendMode: "screen" }} />
          </Link>
          <div className="flex-1" />
          {!authLoading && (
            authenticated ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="icon" title="Log in">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          <div className="text-xs text-muted-foreground px-2 py-1 mb-2 font-bold uppercase tracking-wider">Conversations</div>
          <ConvList />
        </div>

        <div className="p-2 border-t border-border space-y-1 shrink-0">
          <Link
            href="/servers"
            className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-sidebar-accent transition-colors ${
              location === "/servers" ? "bg-sidebar-accent" : "text-sidebar-foreground"
            }`}
          >
            <Server className="h-3 w-3 opacity-50" />
            <span>Servers</span>
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-sidebar-accent transition-colors ${
              location === "/settings" ? "bg-sidebar-accent" : "text-sidebar-foreground"
            }`}
          >
            <Settings className="h-3 w-3 opacity-50" />
            <span>Settings</span>
          </Link>
          {user?.isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-sidebar-accent transition-colors ${
                location.startsWith("/admin") ? "bg-sidebar-accent" : "text-sidebar-foreground"
              }`}
            >
              <ShieldCheck className="h-3 w-3 opacity-50" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar — visible only on small screens */}
        <header className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-sidebar shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
            <Menu className="h-4 w-4" />
          </Button>
          <Link href="/">
            <img src={logoImg} alt="FIX-R" className="h-7 w-auto" style={{ mixBlendMode: "screen" }} />
          </Link>
          <div className="flex-1" />
          {!authLoading && (
            authenticated ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="icon" title="Log in">
                  <LogIn className="h-4 w-4" />
                </Button>
              </Link>
            )
          )}
        </header>

        <main className="flex-1 flex flex-col overflow-hidden bg-background relative min-h-0">
          <img
            src={fixrBg}
            alt=""
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] sm:w-[60%] max-w-[500px] opacity-[0.16] pointer-events-none select-none"
          />
          <div className="relative z-10 flex flex-col flex-1 overflow-hidden min-h-0">
            {children}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs text-white/30 pointer-events-none select-none whitespace-nowrap">
              © 2026 AM Solutions, LLC
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
