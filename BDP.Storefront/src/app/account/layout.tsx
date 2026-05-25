"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const jwt = useAuthStore((s) => s.jwt);

  useEffect(() => {
    if (!jwt) {
      router.replace("/auth/login?next=/account");
    }
  }, [jwt, router]);

  if (!jwt) return null;

  return <>{children}</>;
}
