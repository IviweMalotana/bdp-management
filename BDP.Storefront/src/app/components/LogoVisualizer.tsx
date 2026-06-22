"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

interface Props {
  productImageUrl?: string;
  productName: string;
  variantId?: number;
}

type Placement = { x: number; y: number; scale: number };

/**
 * Free, client-side "envision your logo" tool. Upload a logo, drag/scale it over the
 * bottle photo. Optionally pay a small fee to generate an AI-enhanced "pro mockup"
 * (Photoroom) — the fee is credited back against a later order.
 */
export default function LogoVisualizer({ productImageUrl, productName, variantId }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [place, setPlace] = useState<Placement>({ x: 0.5, y: 0.5, scale: 0.3 });
  const [dragging, setDragging] = useState(false);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fee, setFee] = useState<number | null>(null);

  // Proxy the product image so the export canvas isn't CORS-tainted.
  const proxiedProduct = productImageUrl
    ? `${API}/api/storefront/mockup/image-proxy?url=${encodeURIComponent(productImageUrl)}`
    : null;

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = url;
    setResultUrl(null);
    setMessage(null);
  }

  // Drag handling on the stage (fractions of the stage box).
  function pointerToFrac(clientX: number, clientY: number): { x: number; y: number } | null {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (clientY - box.top) / box.height)),
    };
  }
  function onPointerDown() { if (logoImg) setDragging(true); }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const f = pointerToFrac(e.clientX, e.clientY);
    if (f) setPlace((p) => ({ ...p, x: f.x, y: f.y }));
  }
  function endDrag() { setDragging(false); }

  // Build the flattened composite (product + logo) as a PNG blob for the paid render.
  async function buildComposite(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas || !logoImg || !proxiedProduct) return null;

    const product = await loadImage(proxiedProduct).catch(() => null);
    if (!product) return null;

    const W = product.naturalWidth || 800;
    const H = product.naturalHeight || 800;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(product, 0, 0, W, H);

    const logoW = W * place.scale;
    const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
    ctx.drawImage(logoImg, place.x * W - logoW / 2, place.y * H - logoH / 2, logoW, logoH);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function generatePro() {
    if (!logoImg) { setMessage("Upload your logo first."); return; }
    if (!email.includes("@")) { setMessage("Enter your email so we can credit the fee to your order."); return; }
    setBusy(true);
    setMessage(null);
    try {
      const blob = await buildComposite();
      if (!blob) { setMessage("Couldn't prepare the image. Try a different logo."); setBusy(false); return; }

      const form = new FormData();
      form.append("image", blob, "composite.png");
      form.append("email", email);
      if (variantId) form.append("productVariantId", String(variantId));

      const initRes = await fetch(`${API}/api/storefront/mockup/initiate`, { method: "POST", body: form });
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        setMessage(err.message ?? "Couldn't start the render.");
        setBusy(false);
        return;
      }
      const init = await initRes.json();
      setFee(init.amountZAR);

      const PaystackPop = (window as unknown as { PaystackPop?: { setup: (o: unknown) => { openIframe: () => void } } }).PaystackPop;
      if (!PaystackPop) { setMessage("Payment couldn't load. Please refresh."); setBusy(false); return; }

      const handler = PaystackPop.setup({
        key: init.paystackPublicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.round(init.amountZAR * 100),
        ref: init.paystackReference,
        currency: "ZAR",
        onSuccess: (txn: { reference: string }) => completePro(txn.reference),
        onClose: () => { setBusy(false); setMessage("Payment cancelled."); },
      });
      handler.openIframe();
    } catch {
      setMessage("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  async function completePro(reference: string) {
    try {
      const res = await fetch(`${API}/api/storefront/mockup/complete/${reference}`, { method: "POST" });
      const data = await res.json();
      if (data.resultUrl) setResultUrl(data.resultUrl);
      setMessage(data.message ?? "Done.");
    } catch {
      setMessage("Payment received, but the result is still processing. We'll email it shortly.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);

  const logoPx = place.scale * 100;

  return (
    <div className="mt-10 pt-10" style={{ borderTop: "0.67px solid rgba(184,169,154,0.3)" }}>
      <script src="https://js.paystack.co/v1/inline.js" async />

      <span className="label-caps block mb-2" style={{ color: "#B8B0A4" }}>envision it</span>
      <h2 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}>
        see your logo on it
      </h2>
      <p className="text-sm mb-6" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>
        Upload your logo and drag it into place. Free to preview. Want a polished, studio-quality
        shot? Generate an AI Pro Mockup — and we credit the fee back against your order.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Stage */}
        <div
          ref={stageRef}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="relative select-none"
          style={{
            aspectRatio: "1/1",
            background: proxiedProduct ? "#EDE6DA" : "#E8DDD0",
            border: "0.67px solid rgba(184,169,154,0.3)",
            borderRadius: "2px",
            overflow: "hidden",
            touchAction: "none",
          }}
        >
          {proxiedProduct && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedProduct} alt={productName} className="absolute inset-0 w-full h-full object-cover" draggable={false} crossOrigin="anonymous" />
          )}
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Your logo"
              onPointerDown={onPointerDown}
              draggable={false}
              style={{
                position: "absolute",
                left: `${place.x * 100}%`,
                top: `${place.y * 100}%`,
                width: `${logoPx}%`,
                transform: "translate(-50%, -50%)",
                cursor: dragging ? "grabbing" : "grab",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
              }}
            />
          )}
          {!logoUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <span className="text-sm" style={{ color: "#9A8F80" }}>Upload a logo to preview it here</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div>
          <label className="block mb-4">
            <span className="block text-sm mb-2" style={{ color: "#1A1A18", fontWeight: 500 }}>Your logo (PNG with transparent background works best)</span>
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onPickLogo}
              className="block w-full text-sm" style={{ color: "#4A4540" }} />
          </label>

          {logoImg && (
            <label className="block mb-6">
              <span className="block text-sm mb-2" style={{ color: "#1A1A18", fontWeight: 500 }}>Size</span>
              <input type="range" min={0.1} max={0.7} step={0.01} value={place.scale}
                onChange={(e) => setPlace((p) => ({ ...p, scale: parseFloat(e.target.value) }))}
                className="w-full" />
            </label>
          )}

          <div className="p-5 mb-4" style={{ background: "#EDE6DA", border: "0.67px solid rgba(184,169,154,0.4)", borderRadius: "2px" }}>
            <p className="text-sm mb-3" style={{ color: "#1A1A18", fontWeight: 500 }}>AI Pro Mockup</p>
            <p className="text-xs mb-4" style={{ color: "#B8B0A4", lineHeight: 1.6 }}>
              A clean, studio-quality product shot generated from your design{fee ? ` — R${fee}` : ""}. The fee is credited back when you order.
            </p>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 text-sm"
              style={{ background: "#F5F0E8", border: "0.67px solid rgba(184,169,154,0.5)", borderRadius: "2px", color: "#1A1A18" }}
            />
            <button
              onClick={generatePro}
              disabled={busy || !logoImg}
              className="w-full px-6 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#1A1A18", color: "#F5F0E8", borderRadius: "2px" }}
            >
              {busy ? "Working…" : "Generate AI Pro Mockup"}
            </button>
          </div>

          {message && <p className="text-sm" style={{ color: "#4A4540", lineHeight: 1.6 }}>{message}</p>}

          {resultUrl && (
            <div className="mt-4">
              <p className="text-sm mb-2" style={{ color: "#1A1A18", fontWeight: 500 }}>Your AI mockup</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="AI mockup" className="w-full" style={{ borderRadius: "2px", border: "0.67px solid rgba(184,169,154,0.3)" }} />
              <a href={resultUrl} download className="inline-block mt-3 text-sm" style={{ color: "#C4A882" }}>Download →</a>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
