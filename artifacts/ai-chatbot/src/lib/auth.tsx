import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

interface AuthState {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  authenticated: false,
  user: null,
  loading: true,
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refetch">>({
    authenticated: false,
    user: null,
    loading: true,
  });

  const fetchMe = async () => {
    try {
      const res = await fetch(`/api/auth/me`, { credentials: "include" });
      const data = await res.json();
      setState({ authenticated: data.authenticated, user: data.user ?? null, loading: false });
    } catch {
      setState({ authenticated: false, user: null, loading: false });
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
