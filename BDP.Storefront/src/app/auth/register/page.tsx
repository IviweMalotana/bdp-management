"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { registerUser, mergeCart } from "@/lib/api";

type AccountMode = "B2C" | "B2B";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const cartStore = useCartStore();

  const [mode, setMode] = useState<AccountMode>("B2C");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  const [biz, setBiz] = useState({
    companyName: "",
    vatNumber: "",
    contactPersonName: "",
    billingAddress: "",
    industry: "Hotel",
    requestedPaymentTermsDays: 30,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleBizChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setBiz((prev) => ({
      ...prev,
      [name]: name === "requestedPaymentTermsDays" ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = mode === "B2B" ? { ...form, business: biz } : form;

      const result = await registerUser(payload) as {
        token: string; userId: string; firstName: string; email: string; accountType: string; b2bStatus: string;
      };
      setAuth(result);

      // Merge guest cart non-blockingly
      const guestToken = cartStore.sessionToken;
      mergeCart(result.token, guestToken).catch(() => {/* non-blocking */});
      cartStore.setCart({ id: cartStore.cartId ?? 0, sessionToken: crypto.randomUUID(), items: cartStore.items });

      const next = searchParams.get("next") ?? "/account";
      router.push(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    borderColor: "#C9B8A8",
    borderRadius: "2px",
    backgroundColor: "#FAF8F5",
    color: "#1C1A17",
  };

  const labelStyle = { color: "#4A4540" };

  return (
    <>
      {/* B2C / B2B toggle */}
      <div className="flex gap-2 mb-6">
        {(["B2C", "B2B"] as AccountMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="flex-1 py-2 text-sm font-medium border transition-colors"
            style={{
              borderRadius: "2px",
              borderColor: mode === m ? "#1C1A17" : "#C9B8A8",
              backgroundColor: mode === m ? "#1C1A17" : "transparent",
              color: mode === m ? "#FAF8F5" : "#4A4540",
            }}
          >
            {m === "B2C" ? "Personal" : "Business"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal fields */}
        {[
          { name: "firstName", label: "First name", required: true },
          { name: "lastName", label: "Last name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "password", label: "Password", type: "password", required: true },
          { name: "phone", label: "Phone (optional)", type: "tel" },
        ].map(({ name, label, type = "text", required }) => (
          <div key={name}>
            <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>{label}</label>
            <input
              type={type}
              name={name}
              value={form[name as keyof typeof form]}
              onChange={handleChange}
              required={required}
              className="w-full text-sm px-3 py-2.5 border outline-none"
              style={inputStyle}
            />
          </div>
        ))}

        {/* Business fields */}
        {mode === "B2B" && (
          <div className="space-y-4 pt-2 border-t" style={{ borderColor: "#C9B8A8" }}>
            <p className="text-xs uppercase tracking-widest pt-2" style={{ color: "#4A4540" }}>Business details</p>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>Company name *</label>
              <input type="text" name="companyName" value={biz.companyName} onChange={handleBizChange} required className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>VAT number (optional)</label>
              <input type="text" name="vatNumber" value={biz.vatNumber} onChange={handleBizChange} className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>Contact person name *</label>
              <input type="text" name="contactPersonName" value={biz.contactPersonName} onChange={handleBizChange} required className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>Billing address *</label>
              <input type="text" name="billingAddress" value={biz.billingAddress} onChange={handleBizChange} required className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>Industry *</label>
              <select name="industry" value={biz.industry} onChange={handleBizChange} required className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle}>
                <option value="Hotel">Hotel</option>
                <option value="Spa">Spa</option>
                <option value="Salon">Salon</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={labelStyle}>Payment terms *</label>
              <select name="requestedPaymentTermsDays" value={biz.requestedPaymentTermsDays} onChange={handleBizChange} required className="w-full text-sm px-3 py-2.5 border outline-none" style={inputStyle}>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          </div>
        )}

        {error && <p className="text-xs" style={{ color: "#D4A89A" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-sm font-medium mt-2 disabled:opacity-50"
          style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-md p-8 border"
        style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8", borderRadius: "2px" }}
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl tracking-widest uppercase" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
            BDP
          </Link>
          <p className="text-sm mt-2" style={{ color: "#4A4540" }}>Create your account</p>
        </div>

        <Suspense fallback={<div className="text-sm" style={{ color: "#4A4540" }}>Loading…</div>}>
          <RegisterForm />
        </Suspense>

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
