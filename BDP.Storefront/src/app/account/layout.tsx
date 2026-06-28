"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const jwt = useAuthStore((s) => s.jwt);

  // Wait for the persisted auth store to finish rehydrating from localStorage before
  // deciding the user is logged out. Without this, a hard page load / refresh / bookmark
  // of any /account route briefly sees jwt === null (pre-hydration) and redirects an
  // authenticated user to login. (Client-side link navigation worked because the store
  // was already in memory.)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !jwt) {
      router.replace("/auth/login?next=/account");
    }
  }, [hydrated, jwt, router]);

  if (!hydrated) return null; // still rehydrating — render nothing briefly
  if (!jwt) return null; // confirmed logged out (redirect handled above)

  return <>{children}</>;
}
