import { ReactNode } from "react";

/**
 * Shared presentational shell for the checkout/success states (verifying,
 * confirmed-elsewhere, failed). Purely presentational — no hooks — so it can
 * render in both the Suspense fallback (server) and the client verifier.
 * Matches the Rhode aesthetic of the [orderId] confirmation page.
 */
export default function StatusView({
  spinner = false,
  title,
  body,
  actions,
}: {
  spinner?: boolean;
  title: string;
  body: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      {spinner && (
        <div
          className="mx-auto mb-8 h-8 w-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#E8DDD0", borderTopColor: "#1C1A17" }}
          aria-hidden
        />
      )}
      <h1
        className="text-5xl mb-6"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        {title}
      </h1>
      <div className="text-sm mb-10 leading-relaxed" style={{ color: "#4A4540" }}>
        {body}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">{actions}</div>
      )}
    </div>
  );
}

/** Outlined call-to-action, matching the confirmation page buttons. */
export function GhostLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium border"
      style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
    >
      {children}
    </a>
  );
}

/** Solid call-to-action, matching the confirmation page buttons. */
export function SolidLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium"
      style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
    >
      {children}
    </a>
  );
}
