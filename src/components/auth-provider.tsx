"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthContextValue = {
  supabase: SupabaseClient | null;
  user: User | null;
  nickname: string | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      setNickname(null);
      setIsAdmin(false);
      return;
    }

    let active = true;
    setNickname(user.user_metadata.nickname ?? user.email?.split("@")[0] ?? "팬");
    supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (active && data?.nickname) setNickname(data.nickname);
    });
    supabase.rpc("is_site_admin").then(({ data }) => {
      if (active) setIsAdmin(data === true);
    });

    return () => { active = false; };
  }, [supabase, user]);

  const value = useMemo<AuthContextValue>(() => ({
    supabase,
    user,
    nickname,
    isAdmin,
    loading,
    signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [supabase, user, nickname, isAdmin, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
