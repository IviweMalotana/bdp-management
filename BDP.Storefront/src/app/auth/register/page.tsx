"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { registerUser } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await registerUser(form) as {
        token: string; userId: string; firstName: string; email: string;
      };
      setAuth({ ...result, accountType: "B2C" });
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<{ name: keyof typeof form; label: string; type?: string; required?: boolean }> = [
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", required: true },
    { name: "phone", label: "Phone (optional)", type: "tel" },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-sm p-8 border"
        style={{ backgroundColor: "#FEFCFA", borderColor: "#C9B8A8", borderRadius: "2px" }}
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
            BDP
          </Link>
          <p className="text-sm mt-2" style={{ color: "#4A4540" }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ name, label, type = "text", required }) => (
            <div key={name}>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>{label}</label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required={required}
                className="w-full text-sm px-3 py-2.5 border outline-none"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
              />
            </div>
          ))}

          {error && <p className="text-xs" style={{ color: "#D4A89A" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm font-medium mt-2 disabled:opacity-50"
            style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "#4A4540" }}>
          Already have an account?{" "}
          <Link href="/auth/login" className="underline" style={{ color: "#1C1A17" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
