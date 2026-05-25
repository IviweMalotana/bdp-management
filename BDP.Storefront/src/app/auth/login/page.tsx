"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginUser({ email, password }) as {
        token: string; userId: string; firstName: string; email: string; accountType: string;
      };
      setAuth(result);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-sm p-8 border"
        style={{ backgroundColor: "#FEFCFA", borderColor: "#C9B8A8", borderRadius: "2px" }}
      >
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-2xl tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
          >
            BDP
          </Link>
          <p className="text-sm mt-2" style={{ color: "#4A4540" }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm px-3 py-2.5 border outline-none focus:border-ink"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm px-3 py-2.5 border outline-none"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: "#D4A89A" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium mt-2 disabled:opacity-50"
            style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "#4A4540" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="underline" style={{ color: "#1C1A17" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
