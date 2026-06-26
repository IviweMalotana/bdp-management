"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { verifyCheckout } from "@/lib/api";
import StatusView, { GhostLink, SolidLink } from "./StatusView";

type Status = "verifying" | "noref" | "failed";

/**
 * Handles the bare /checkout/success callback. The inline Paystack popup
 * resolves payment in-page and pushes straight to /checkout/success/{orderId},
 * so this only runs when Paystack falls back to the server callback_url (some
 * bank / 3-D Secure redirect flows) and lands the customer here with
 * ?reference= / ?trxref= appended. We verify, then forward to the real
 * order-confirmation page so the experience is identical to the popup path.
 */
export default function PaymentVerifier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const getSessionToken = useCartStore((s) => s.getSessionToken);
  const clearCart = useCartStore((s) => s.clearCart);
  const jwt = useAuthStore((s) => s.jwt);

  const [status, setStatus] = useState<Status>("verifying");
  const ranRef = useRef(false);

  // Paystack uses `reference`; older integrations send `trxref` — accept both.
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  useEffect(() => {
    if (ranRef.current) return; // verify exactly once, even across re-renders
    ranRef.current = true;

    if (!reference) {
      setStatus("noref");
      return;
    }

    (async () => {
      try {
        const result = (await verifyCheckout(
          reference,
          getSessionToken(),
          jwt ?? undefined,
        )) as { success: boolean; orderId: number };

        if (result.success && result.orderId) {
          clearCart();
          router.replace(`/checkout/success/${result.orderId}`);
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
      }
    })();
  }, [reference, getSessionToken, clearCart, jwt, router]);

  if (status === "verifying") {
    return (
      <StatusView
        spinner
        title="confirming payment."
        body="Hold on a moment while we confirm your transaction with Paystack."
      />
    );
  }

  if (status === "noref") {
    return (
      <StatusView
        title="nothing to confirm."
        body={
          <>
            We couldn&apos;t find a payment to confirm here. If you&apos;ve just
            checked out, your receipt is on its way by email — or track your order
            any time.
          </>
        }
        actions={
          <>
            <GhostLink href="/shop">Continue shopping</GhostLink>
            <SolidLink href="/track">Track your order</SolidLink>
          </>
        }
      />
    );
  }

  // failed
  return (
    <StatusView
      title="payment not confirmed."
      body={
        <>
          We couldn&apos;t verify this payment just now. If you were charged,
          don&apos;t worry — it reconciles automatically and your confirmation
          email will follow. If anything looks off, our team is happy to help.
        </>
      }
      actions={
        <>
          <GhostLink href="/cart">Return to cart</GhostLink>
          <SolidLink href="/contact">Contact us</SolidLink>
        </>
      }
    />
  );
}
