"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { shippingQuote, initiateCheckout, verifyCheckout } from "@/lib/api";

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

const addressSchema = z.object({
  recipientName: z.string().min(2),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  province: z.string().min(2),
  postalCode: z.string().min(4),
  phone: z.string().optional(),
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
        style={{ borderColor: error ? "#D4A89A" : "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
        {...props}
      />
      {error && <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartId, getSessionToken, clearCart } = useCartStore();
  const { jwt, email: userEmail } = useAuthStore();

  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [shipping, setShipping] = useState<{ shippingZAR: number; estimatedDays: string } | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<{ orderId: number; paystackReference: string; paystackPublicKey: string; amountZAR: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.lineTotalZAR, 0);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: userEmail ?? "", sameAsBilling: true },
  });

  const sameAsBilling = watch("sameAsBilling");

  async function onStep1Submit(data: Step1Data) {
    setLoading(true);
    try {
      const result = await shippingQuote({
        cartId: cartId ?? 0,
        address: {
          city: data.shipping.city,
          province: data.shipping.province,
          postalCode: data.shipping.postalCode,
        },
      }) as { shippingZAR: number; estimatedDays: string };
      setShipping(result);
      setStep1Data(data);
      setStep(2);
    } catch {
      alert("Could not calculate shipping. Please check your address.");
    } finally {
      setLoading(false);
    }
  }

  async function onStep2Confirm() {
    if (!step1Data || !cartId) return;
    setLoading(true);
    try {
      const billingAddress = step1Data.sameAsBilling ? step1Data.shipping : step1Data.billing!;
      const result = await initiateCheckout({
        cartId,
        shippingAddress: step1Data.shipping,
        billingAddress,
        guestEmail: jwt ? undefined : step1Data.email,
        paymentMethod: "Paystack_Card",
      }, jwt ?? undefined) as typeof checkoutResult;
      setCheckoutResult(result);
      setStep(3);
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

  const steps = ["Contact & shipping", "Review", "Payment"];

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
                  backgroundColor: i + 1 <= step ? "#1C1A17" : "#EDE4D8",
                  color: i + 1 <= step ? "#F5EFE6" : "#4A4540",
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

      {step === 1 && (
        <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-6">
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>Contact & shipping</h2>

          <InputField label="Email" type="email" {...register("email")} error={errors.email?.message} />

          <div className="space-y-4">
            <h3 className="text-sm font-medium" style={{ color: "#1C1A17" }}>Shipping address</h3>
            <InputField label="Recipient name" {...register("shipping.recipientName")} error={errors.shipping?.recipientName?.message} />
            <InputField label="Address line 1" {...register("shipping.line1")} error={errors.shipping?.line1?.message} />
            <InputField label="Address line 2 (optional)" {...register("shipping.line2")} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="City" {...register("shipping.city")} error={errors.shipping?.city?.message} />
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>Province</label>
                <select
                  className="w-full text-sm px-3 py-2.5 border outline-none"
                  style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
                  {...register("shipping.province")}
                >
                  <option value="">Select…</option>
                  {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Postal code" {...register("shipping.postalCode")} error={errors.shipping?.postalCode?.message} />
              <InputField label="Phone (optional)" type="tel" {...register("shipping.phone")} />
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
                  <select className="w-full text-sm px-3 py-2.5 border outline-none" style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }} {...register("billing.province")}>
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
            disabled={loading}
            className="w-full py-4 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
          >
            {loading ? "Calculating shipping…" : "Continue →"}
          </button>
        </form>
      )}

      {step === 2 && step1Data && shipping && (
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
            <div className="flex justify-between"><span>Shipping ({shipping.estimatedDays} days)</span><span>{formatZAR(shipping.shippingZAR)}</span></div>
            <div className="flex justify-between font-medium text-base pt-2 border-t" style={{ borderColor: "#C9B8A8" }}>
              <span>Total</span><span>{formatZAR(subtotal + shipping.shippingZAR)}</span>
            </div>
          </div>

          <div className="text-sm" style={{ color: "#4A4540" }}>
            <p className="mb-1"><strong>Shipping to:</strong></p>
            <p>{step1Data.shipping.recipientName}, {step1Data.shipping.line1}, {step1Data.shipping.city}, {step1Data.shipping.province} {step1Data.shipping.postalCode}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3.5 text-sm border" style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}>
              ← Back
            </button>
            <button
              onClick={onStep2Confirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
            >
              {loading ? "Processing…" : "Confirm & pay →"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && checkoutResult && (
        <div className="text-center">
          <h2 className="text-3xl mb-4" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>
            ready to pay
          </h2>
          <p className="text-sm mb-8" style={{ color: "#4A4540" }}>
            Total: {formatZAR(checkoutResult.amountZAR)}. You&apos;ll be redirected to Paystack to complete payment securely.
          </p>
          <button
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
