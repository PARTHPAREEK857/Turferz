"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import type { SessionUser } from "@/lib/types";
import { Modal } from "./ui/modal";
import { AuthForm } from "./auth-form";
import { ToastProvider } from "./ui/toast";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** Open the auth modal when the user tries to do something signed-out. */
  openAuth: (mode?: "login" | "register") => void;
  /** Returns true when authenticated; otherwise opens the auth modal. */
  requireAuth: (action?: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <Providers>");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "login" | "register"; action?: string }>({
    open: false,
    mode: "login",
  });

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.login({ email, password });
    setUser(user);
    setModal((m) => ({ ...m, open: false }));
    return user;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const { user } = await api.register(input);
      setUser(user);
      setModal((m) => ({ ...m, open: false }));
      return user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { user } = await api.me().catch(() => ({ user: null as SessionUser | null }));
    setUser(user);
  }, []);

  const openAuth = useCallback((mode: "login" | "register" = "login", action?: string) => {
    setModal({ open: true, mode, action });
  }, []);

  const requireAuth = useCallback(
    (action?: string) => {
      if (user) return true;
      openAuth("login", action);
      return false;
    },
    [user, openAuth],
  );

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout, openAuth, requireAuth }),
    [user, loading, refresh, login, register, logout, openAuth, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.mode === "login" ? "Welcome back" : "Create your account"}
        description={
          modal.action
            ? modal.action
            : modal.mode === "login"
              ? "Sign in to continue."
              : "Join Turferz to book turfs and enter tournaments."
        }
      >
        {modal.open ? (
          <AuthForm
            mode={modal.mode}
            onModeChange={(mode) => setModal((m) => ({ ...m, mode }))}
            onDone={async (user) => {
              setUser(user);
              setModal((m) => ({ ...m, open: false }));
            }}
            compact
          />
        ) : null}
      </Modal>
    </AuthContext.Provider>
  );
}
