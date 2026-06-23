"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { getShippingOptions, initiateCheckout, verifyCheckout, ShippingOption } from "@/lib/api";

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

const COUNTRY_OPTIONS = [
  { label: "South Africa", value: "ZA" },
  { label: "United Kingdom", value: "GB" },
  { label: "United States", value: "US" },
  { label: "European Union", value: "EU" },
  { label: "Australia", value: "AU" },
  { label: "Other", value: "OTHER" },
];

// Map EU and OTHER to a representative ISO code for the API
function apiCountryCode(value: string): string {
  if (value === "EU") return "DE";
  if (value === "OTHER") return "REST";
  return value;
}

const addressSchema = z.object({
  recipientName: z.string().min(2),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  province: z.string().min(2),
  postalCode: z.string().min(4),
  phone: z.string().min(7, "Phone number is required"),
  country: z.string().min(2),
});

const step1Schema = z.object({
  email: z.string().email(),
  shipping: addressSchema,
  sameAsBilling: z.boolean(),
  billing: addressSchema.optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InputField({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>{label}</label>
      <input
        className="w-full text-sm px-3 py-2.5 border outline-none"
        style={{ borderColor: error ? "#D4A89A" : "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
        {...props}
      />
      {error && <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>{error}</p>}
    </div>
  );
}

function AirIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#C9B8A8", flexShrink: 0, marginTop: "2px" }}>
      <path d="M21 16l-4-4H5l-2 2 7 2 2 7 2-2v-5z" />
      <path d="M21 8l-4 4" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#C9B8A8", flexShrink: 0, marginTop: "2px" }}>
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7l-7-3-7 3v6" />
      <path d="M12 4v9" />
    </svg>
  );
}

function ShippingOptionCard({ option, selected, onSelect }: { option: ShippingOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left p-4 border transition-all"
      style={{
        borderColor: selected ? "#1C1A17" : "#C9B8A8",
        borderRadius: "2px",
        backgroundColor: selected ? "#FAF8F5" : "#FAF8F5",
        borderWidth: selected ? "2px" : "1px",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {option.icon === "air" ? <AirIcon /> : <ShipIcon />}
          <div>
            <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>{option.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>{option.description}</p>
            <p className="text-xs mt-1.5" style={{ color: "#C9B8A8" }}>
              {option.transitDaysMin}–{option.transitDaysMax} business days
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>R {option.priceZAR.toFixed(2)}</p>
          {option.customsIncluded && (
            <span
              className="text-[10px] px-1.5 py-0.5 mt-1 inline-block uppercase tracking-wider"
              style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
            >
              duties incl.
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ShippingOptionSkeleton() {
  return (
    <div className="p-4 border animate-pulse" style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-5 h-5 rounded" style={{ backgroundColor: "#E8DDD0" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-28" style={{ backgroundColor: "#E8DDD0" }} />
            <div className="h-3 rounded w-48" style={{ backgroundColor: "#E8DDD0" }} />
            <div className="h-3 rounded w-20" style={{ backgroundColor: "#E8DDD0" }} />
          </div>
        </div>
        <div className="h-4 w-16 rounded" style={{ backgroundColor: "#E8DDD0" }} />
      </div>
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const ALLOWED_TYPES = ".pdf,.ai,.eps,.png,.jpg,.jpeg,.svg";

function ArtworkUploader({
  cartItemId,
  sessionToken,
  jwt,
  label,
}: {
  cartItemId: number;
  sessionToken: string;
  jwt: string | null;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setErrorMsg(null);
    const body = new FormData();
    body.append("file", file);
    const headers: Record<string, string> = { "X-Cart-Token": sessionToken };
    if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
    try {
      const res = await fetch(`${API_URL}/api/storefront/artwork/cart-items/${cartItemId}`, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? "Upload failed");
      }
      const d = await res.json();
      setFileName(d.fileName);
      setStatus("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  }

  return (
    <div className="mt-2">
      <p className="text-xs mb-1.5" style={{ color: "#4A4540" }}>{label}</p>
      <div
        className="border border-dashed p-4 text-center cursor-pointer"
        style={{ borderColor: status === "done" ? "#9E8F83" : "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {status === "idle" && (
          <p className="text-xs" style={{ color: "#9E8F83" }}>
            Click or drag to upload artwork<br />
            <span style={{ color: "#C9B8A8" }}>PDF, AI, EPS, PNG, JPG, SVG. Max 20 MB</span>
          </p>
        )}
        {status === "uploading" && <p className="text-xs" style={{ color: "#9E8F83" }}>Uploading…</p>}
        {status === "done" && (
          <p className="text-xs" style={{ color: "#4A4540" }}>
            ✓ {fileName} uploaded.{" "}
            <span className="underline cursor-pointer" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>replace</span>
          </p>
        )}
        {status === "error" && (
          <p className="text-xs" style={{ color: "#D4A89A" }}>{errorMsg}. Click to retry</p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartId, getSessionToken, clearCart } = useCartStore();
  const { jwt, email: userEmail } = useAuthStore();

  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<{ orderId: number; paystackReference: string; paystackPublicKey: string; amountZAR: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const customisedItems = items.filter((i) => i.customisationOptionId != null);

  const subtotal = items.reduce((s, i) => s + i.lineTotalZAR, 0);
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const totalWeightGrams = items.reduce((s, i) => s + (i.weightKg ?? 0.08) * i.quantity * 1000, 0);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: userEmail ?? "", sameAsBilling: true, shipping: { country: "ZA" } },
  });

  const sameAsBilling = watch("sameAsBilling");
  const shippingCountry = watch("shipping.country");

  async function loadShippingOptions(country: string) {
    setShippingLoading(true);
    setShippingError(null);
    setSelectedOption(null);
    try {
      const options = await getShippingOptions(apiCountryCode(country), Math.max(1, Math.round(totalWeightGrams)));
      setShippingOptions(options);
    } catch {
      setShippingError("Could not load shipping options. Please try again.");
      setShippingOptions([]);
    } finally {
      setShippingLoading(false);
    }
  }

  async function onStep1Submit(data: Step1Data) {
    setStep1Data(data);
    await loadShippingOptions(data.shipping.country);
    setStep(2);
  }

  async function onStep2Continue() {
    if (!selectedOption || !step1Data) return;
    setStep(3);
  }

  async function onStep3Confirm() {
    if (!step1Data || !cartId || !selectedOption) return;
    setLoading(true);
    try {
      const billingAddress = step1Data.sameAsBilling ? step1Data.shipping : step1Data.billing!;
      const result = await initiateCheckout({
        cartId,
        shippingAddress: step1Data.shipping,
        billingAddress,
        guestEmail: jwt ? undefined : step1Data.email,
        paymentMethod: "Paystack_Card",
        shippingServiceCode: selectedOption.code,
        shippingServiceName: selectedOption.name,
        shippingPriceZAR: selectedOption.priceZAR,
      }, jwt ?? undefined) as typeof checkoutResult;
      setCheckoutResult(result);
      setStep(4);
    } catch (e: unknown) {
      alert(`Checkout failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function onPaymentSuccess(reference: string) {
    const token = getSessionToken();
    const result = await verifyCheckout(reference, token, jwt ?? undefined) as { success: boolean; orderId: number };
    if (result.success) {
      clearCart();
      router.push(`/checkout/success/${result.orderId}`);
    }
  }

  function launchPaystack() {
    if (!checkoutResult) return;
    const PaystackPop = (window as unknown as { PaystackPop: { setup: (opts: unknown) => { openIframe: () => void } } }).PaystackPop;
    if (!PaystackPop) { alert("Paystack not loaded. Please refresh."); return; }
    const handler = PaystackPop.setup({
      key: checkoutResult.paystackPublicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: step1Data?.email,
      amount: Math.round(checkoutResult.amountZAR * 100),
      ref: checkoutResult.paystackReference,
      currency: "ZAR",
      onSuccess: (transaction: { reference: string }) => onPaymentSuccess(transaction.reference),
      onClose: () => {},
    });
    handler.openIframe();
  }

  const steps = ["Contact & address", "Shipping", "Review", "Payment"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Paystack script */}
      <script src="https://js.paystack.co/v1/inline.js" async />

      {/* Progress */}
      <div className="flex items-center gap-3 mb-12">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: i + 1 <= step ? "#1C1A17" : "#E8DDD0",
                  color: i + 1 <= step ? "#FAF8F5" : "#4A4540",
                }}
              >
                {i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i + 1 === step ? "#1C1A17" : "#C9B8A8" }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px" style={{ backgroundColor: "#C9B8A8" }} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Contact & address */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>Contact & address</h2>

          <InputField label="Email" type="email" {...register("email")} error={errors.email?.message} />

          <div className="space-y-4">
            <h3 className="text-sm font-medium" style={{ color: "#1C1A17" }}>Shipping address</h3>
            <InputField label="Recipient name" {...register("shipping.recipientName")} error={errors.shipping?.recipientName?.message} />
            <InputField label="Address line 1" {...register("shipping.line1")} error={errors.shipping?.line1?.message} />
            <InputField label="Address line 2 (optional)" {...register("shipping.line2")} />

            {/* Country selector */}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Country</label>
              <select
                className="w-full text-sm px-3 py-2.5 border outline-none"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                {...register("shipping.country")}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="City" {...register("shipping.city")} error={errors.shipping?.city?.message} />
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>
                  {shippingCountry === "ZA" ? "Province" : "State / Region"}
                </label>
                {shippingCountry === "ZA" ? (
                  <select
                    className="w-full text-sm px-3 py-2.5 border outline-none"
                    style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                    {...register("shipping.province")}
                  >
                    <option value="">Select…</option>
                    {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <input
                    className="w-full text-sm px-3 py-2.5 border outline-none"
                    style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                    placeholder="State / Region"
                    {...register("shipping.province")}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Postal code" {...register("shipping.postalCode")} error={errors.shipping?.postalCode?.message} />
              <InputField label="Phone" type="tel" {...register("shipping.phone")} error={errors.shipping?.phone?.message} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#1C1A17" }}>
            <input type="checkbox" {...register("sameAsBilling")} className="w-4 h-4" />
            Billing address same as shipping
          </label>

          {!sameAsBilling && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium" style={{ color: "#1C1A17" }}>Billing address</h3>
              <InputField label="Recipient name" {...register("billing.recipientName")} />
              <InputField label="Address line 1" {...register("billing.line1")} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="City" {...register("billing.city")} />
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Province</label>
                  <select className="w-full text-sm px-3 py-2.5 border outline-none" style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }} {...register("billing.province")}>
                    <option value="">Select…</option>
                    {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <InputField label="Postal code" {...register("billing.postalCode")} />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 text-sm font-medium"
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            Continue →
          </button>
        </form>
      )}

      {/* Step 2 — Shipping options */}
      {step === 2 && step1Data && (
        <div className="space-y-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>Choose shipping</h2>
          <p className="text-sm" style={{ color: "#4A4540" }}>
            Shipping to {COUNTRY_OPTIONS.find(c => c.value === step1Data.shipping.country)?.label ?? step1Data.shipping.country} · {totalUnits} {totalUnits === 1 ? "unit" : "units"}
          </p>

          {shippingLoading && (
            <div className="space-y-3">
              <ShippingOptionSkeleton />
              <ShippingOptionSkeleton />
              <ShippingOptionSkeleton />
            </div>
          )}

          {!shippingLoading && shippingError && (
            <div className="p-4 text-sm space-y-3" style={{ backgroundColor: "#FDF6F4", borderRadius: "2px", border: "1px solid #D4A89A" }}>
              <p style={{ color: "#1C1A17" }}>{shippingError}</p>
              <button
                type="button"
                onClick={() => loadShippingOptions(step1Data.shipping.country)}
                className="text-xs underline"
                style={{ color: "#4A4540" }}
              >
                Retry
              </button>
            </div>
          )}

          {!shippingLoading && !shippingError && shippingOptions.length > 0 && (
            <div className="space-y-3">
              {shippingOptions.map((option) => (
                <ShippingOptionCard
                  key={option.code}
                  option={option}
                  selected={selectedOption?.code === option.code}
                  onSelect={() => setSelectedOption(option)}
                />
              ))}
            </div>
          )}
          {customisedItems.length > 0 && (
            <p className="text-xs mt-2" style={{ color: "#9E8F83" }}>
              Customised items add about 1 week of production time before dispatch.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 text-sm border"
              style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onStep2Continue}
              disabled={!selectedOption || shippingLoading}
              className="flex-1 py-3.5 text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && step1Data && selectedOption && (
        <div className="space-y-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>Review your order</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm" style={{ color: "#1C1A17" }}>
                <span>{item.variant?.sku} × {item.quantity}</span>
                <span>{formatZAR(item.lineTotalZAR)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2 text-sm" style={{ borderColor: "#C9B8A8", color: "#1C1A17" }}>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatZAR(subtotal)}</span></div>
            <div className="flex justify-between items-start gap-2">
              <div>
                <span>{selectedOption.name}</span>
                <span className="ml-2 text-xs" style={{ color: "#4A4540" }}>({selectedOption.transitDaysMin}–{selectedOption.transitDaysMax} days)</span>
                {selectedOption.customsIncluded && (
                  <span
                    className="ml-2 text-[10px] px-1.5 py-0.5 inline-block uppercase tracking-wider"
                    style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
                  >
                    duties incl.
                  </span>
                )}
              </div>
              <span className="shrink-0">{formatZAR(selectedOption.priceZAR)}</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-2 border-t" style={{ borderColor: "#C9B8A8" }}>
              <span>Total</span><span>{formatZAR(subtotal + selectedOption.priceZAR)}</span>
            </div>
          </div>

          <div className="text-sm" style={{ color: "#4A4540" }}>
            <p className="mb-1"><strong>Shipping to:</strong></p>
            <p>{step1Data.shipping.recipientName}, {step1Data.shipping.line1}, {step1Data.shipping.city}, {step1Data.shipping.province} {step1Data.shipping.postalCode}</p>
          </div>

          {customisedItems.length > 0 && (
            <div className="space-y-4 border-t pt-4" style={{ borderColor: "#C9B8A8" }}>
              <div>
                <h3 className="text-sm font-medium mb-0.5" style={{ color: "#1C1A17" }}>Artwork / logo files</h3>
                <p className="text-xs" style={{ color: "#9E8F83" }}>
                  Upload your artwork for each customised item. Our team will review it before production.
                </p>
              </div>
              {customisedItems.map((item) => (
                <ArtworkUploader
                  key={item.id}
                  cartItemId={item.id}
                  sessionToken={getSessionToken()}
                  jwt={jwt}
                  label={`Customisation artwork for ${item.variant?.sku} × ${item.quantity}`}
                />
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3.5 text-sm border"
              style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onStep3Confirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
            >
              {loading ? "Processing…" : "Confirm & pay →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Payment */}
      {step === 4 && checkoutResult && (
        <div className="text-center">
          <h2 className="text-3xl mb-4" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>
            ready to pay
          </h2>
          <p className="text-sm mb-8" style={{ color: "#4A4540" }}>
            Total: {formatZAR(checkoutResult.amountZAR)}. You&apos;ll be redirected to Paystack to complete payment securely.
          </p>
          <button
            type="button"
            onClick={launchPaystack}
            className="w-full py-4 text-sm font-medium"
            style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
          >
            Pay now with Paystack →
          </button>
        </div>
      )}
    </div>
  );
}
