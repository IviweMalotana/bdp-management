"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

interface FormState {
  name: string;
  email: string;
  company: string;
  message: string;
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/storefront/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setForm({ name: "", email: "", company: "", message: "" });
    } catch {
      setError("Unable to send your message. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    borderColor: "#C9B8A8",
    borderRadius: "2px",
    backgroundColor: "#FAF8F5",
    color: "#1C1A17",
  } as React.CSSProperties;

  if (success) {
    return (
      <div
        className="flex flex-col justify-center py-12 text-center border"
        style={{ borderColor: "#C9B8A8", borderRadius: "2px", padding: "2.5rem" }}
      >
        <p
          className="text-2xl mb-3"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
        >
          Thank you.
        </p>
        <p className="text-sm" style={{ color: "#4A4540" }}>
          We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#4A4540" }}>
          Name <span style={{ color: "#D4A89A" }}>*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full text-sm px-3 py-2.5 border outline-none"
          style={inputStyle}
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#4A4540" }}>
          Email <span style={{ color: "#D4A89A" }}>*</span>
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full text-sm px-3 py-2.5 border outline-none"
          style={inputStyle}
          placeholder="you@yourbrand.com"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#4A4540" }}>
          Company <span className="text-xs normal-case" style={{ color: "#C9B8A8" }}>(optional)</span>
        </label>
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={handleChange}
          className="w-full text-sm px-3 py-2.5 border outline-none"
          style={inputStyle}
          placeholder="Your brand or company"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: "#4A4540" }}>
          Message <span style={{ color: "#D4A89A" }}>*</span>
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full text-sm px-3 py-2.5 border outline-none resize-none"
          style={inputStyle}
          placeholder="Tell us about your project, quantities, or any questions you have…"
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "#D4A89A" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-sm font-medium tracking-wide transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
      >
        {submitting ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
