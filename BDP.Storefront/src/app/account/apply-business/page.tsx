"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { applyForB2B, getMe } from "@/lib/api";

interface MeData {
  b2bStatus: string;
}

export default function ApplyBusinessPage() {
  const router = useRouter();
  const { jwt, setAuth } = useAuthStore();
  const authState = useAuthStore();

  const [form, setForm] = useState({
    companyName: "",
    vatNumber: "",
    contactPersonName: "",
    billingAddress: "",
    industry: "Hotel",
    requestedPaymentTermsDays: 30,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "requestedPaymentTermsDays" ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jwt) return;
    setError("");
    setLoading(true);
    try {
      await applyForB2B(jwt, form);
      // Refresh /me to get updated b2bStatus
      const updated = await getMe(jwt) as MeData;
      // Update authStore with new b2bStatus (preserve all other fields)
      setAuth({
        token: jwt,
        userId: authState.userId!,
        firstName: authState.firstName!,
        email: authState.email!,
        accountType: "B2B",
        b2bStatus: updated.b2bStatus,
      });
      router.push("/account");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    borderColor: "#C9B8A8",
    borderRadius: "2px",
    backgroundColor: "#FEFCFA",
    color: "#1C1A17",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12" style={{ minHeight: "80vh" }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account" className="text-sm underline" style={{ color: "#4A4540" }}>
          ← Account
        </Link>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
          Business account application
        </h1>
      </div>

      <p className="text-sm mb-8" style={{ color: "#4A4540" }}>
        Apply for a business account to access bulk pricing, extended payment terms, and a dedicated account manager.
        Applications are reviewed within 2 business days.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-6 border"
        style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
      >
        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Company name *</label>
          <input
            type="text"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            required
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>VAT number (optional)</label>
          <input
            type="text"
            name="vatNumber"
            value={form.vatNumber}
            onChange={handleChange}
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Contact person name *</label>
          <input
            type="text"
            name="contactPersonName"
            value={form.contactPersonName}
            onChange={handleChange}
            required
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Billing address *</label>
          <input
            type="text"
            name="billingAddress"
            value={form.billingAddress}
            onChange={handleChange}
            required
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Industry *</label>
          <select
            name="industry"
            value={form.industry}
            onChange={handleChange}
            required
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          >
            <option value="Hotel">Hotel</option>
            <option value="Spa">Spa</option>
            <option value="Salon">Salon</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Requested payment terms *</label>
          <select
            name="requestedPaymentTermsDays"
            value={form.requestedPaymentTermsDays}
            onChange={handleChange}
            required
            className="w-full text-sm px-3 py-2.5 border outline-none"
            style={inputStyle}
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
        </div>

        {error && <p className="text-xs" style={{ color: "#D4A89A" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-sm font-medium mt-2 disabled:opacity-50"
          style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
