import { Suspense } from "react";
import PaymentVerifier from "./PaymentVerifier";
import StatusView from "./StatusView";

// Bare /checkout/success — the Paystack callback_url target. useSearchParams in
// PaymentVerifier requires a Suspense boundary (Next App Router), so the page
// shell renders the verifying state until the client component hydrates.
export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <StatusView
          spinner
          title="confirming payment."
          body="Hold on a moment while we confirm your transaction with Paystack."
        />
      }
    >
      <PaymentVerifier />
    </Suspense>
  );
}
