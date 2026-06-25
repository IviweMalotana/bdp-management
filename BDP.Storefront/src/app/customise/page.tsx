"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const TECHNIQUES = [
  {
    name: "Silk Screen Printing",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Up to 2 colours printed directly onto the bottle. Clean, precise, and durable. Ideal for logos, wordmarks, and simple graphics.",
    startingFrom: "R15.00 / unit",
  },
  {
    name: "Hot Stamp Foiling",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Metallic foil transferred under heat. Gives your packaging a premium, luxurious feel. Available in gold, silver, rose gold, and more.",
    startingFrom: "R16.50 / unit",
  },
];

type BKey = "dropper" | "pump" | "jar";

// Label area on the canvas: [x, y, width, height] in pixels
// dropper: these are % of canvas — resolved after photo loads
const LABEL_AREAS: Record<BKey, [number, number, number, number]> = {
  dropper: [0, 0, 0, 0], // computed dynamically from photo dimensions
  pump:    [60, 120, 120, 244],
  jar:     [42, 134, 156, 144],
};

// Where the bottle body label sits on the Delila photo, as fractions [x, y, w, h]
const DELILA_LABEL_FRAC = [0.22, 0.38, 0.56, 0.42] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://bdp-api-production.up.railway.app";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function warpLogo(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  lx: number, ly: number, lw: number, lh: number,
  clipPath: () => void
) {
  const tmp = document.createElement("canvas");
  tmp.width = logoImg.naturalWidth; tmp.height = logoImg.naturalHeight;
  const tc = tmp.getContext("2d")!;
  tc.drawImage(logoImg, 0, 0);
  const src = tc.getImageData(0, 0, tmp.width, tmp.height);

  const wc = document.createElement("canvas");
  wc.width = lw; wc.height = lh;
  const wctx = wc.getContext("2d")!;
  const dst = wctx.createImageData(lw, lh);
  const sw = tmp.width, sh = tmp.height;

  for (let oy = 0; oy < lh; oy++) {
    for (let ox = 0; ox < lw; ox++) {
      const t = (2 * ox) / lw - 1;
      if (t <= -0.999 || t >= 0.999) continue;
      const sx = Math.round(((Math.PI - Math.acos(t)) / Math.PI) * sw);
      const sy = Math.round((oy / lh) * sh);
      if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
      const si = (sy * sw + sx) * 4, di = (oy * lw + ox) * 4;
      dst.data[di] = src.data[si]; dst.data[di+1] = src.data[si+1];
      dst.data[di+2] = src.data[si+2]; dst.data[di+3] = src.data[si+3];
    }
  }
  wctx.putImageData(dst, 0, 0);

  ctx.save();
  clipPath();
  ctx.clip();
  ctx.drawImage(wc, lx, ly);
  const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.22)");
  grad.addColorStop(0.15, "rgba(0,0,0,0)");
  grad.addColorStop(0.85, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = grad; ctx.fillRect(lx, ly, lw, lh);
  ctx.restore();
}

function LogoPreviewTool() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bottleKey, setBottleKey] = useState<BKey>("dropper");
  const [delilaImg, setDelilaImg] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CW = 320, CH = 520;

  // Fetch Delila's primary image on mount
  useEffect(() => {
    fetch(`${API_URL}/api/storefront/products/delila`)
      .then((r) => r.json())
      .then((data) => {
        const primary = (data.images as { url: string; isPrimary: boolean }[])
          ?.find((i) => i.isPrimary) ?? data.images?.[0];
        if (!primary?.url) return;
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setDelilaImg(img);
        img.src = primary.url;
      })
      .catch(() => {});
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoUrl(URL.createObjectURL(f));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CW, CH);

    // ── Dropper: use Delila photo ──────────────────────────────────────────
    if (bottleKey === "dropper") {
      const drawDropper = (photoImg: HTMLImageElement | null) => {
        ctx.clearRect(0, 0, CW, CH);

        if (photoImg) {
          // Fit photo into canvas maintaining aspect ratio, centred
          const ratio = Math.min(CW / photoImg.naturalWidth, CH / photoImg.naturalHeight);
          const dw = photoImg.naturalWidth * ratio;
          const dh = photoImg.naturalHeight * ratio;
          const dx = (CW - dw) / 2;
          const dy = (CH - dh) / 2;
          ctx.drawImage(photoImg, dx, dy, dw, dh);

          // Label area in canvas pixels
          const lx = dx + DELILA_LABEL_FRAC[0] * dw;
          const ly = dy + DELILA_LABEL_FRAC[1] * dh;
          const lw = DELILA_LABEL_FRAC[2] * dw;
          const lh = DELILA_LABEL_FRAC[3] * dh;

          if (!logoUrl) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(lx + 8, ly + 8, lw - 16, lh - 16);
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("UPLOAD LOGO", lx + lw / 2, ly + lh / 2);
            ctx.restore();
            return;
          }

          const logoImg = new window.Image();
          logoImg.onload = () => {
            ctx.drawImage(photoImg, dx, dy, dw, dh); // redraw photo cleanly
            warpLogo(ctx, logoImg, lx, ly, lw, lh, () => {
              ctx.rect(lx, ly, lw, lh); // clip to label rect; photo handles bottle shape
            });
          };
          logoImg.src = logoUrl;
        } else {
          // Fallback: drawn shape while photo loads
          rr(ctx, 108, 108, 104, 358, 10); ctx.fillStyle = "#CBC0B4"; ctx.fill();
          if (!logoUrl) {
            ctx.save();
            ctx.strokeStyle = "rgba(201,184,168,0.35)";
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(118, 178, 84, 202);
            ctx.fillStyle = "rgba(201,184,168,0.45)";
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("UPLOAD LOGO", 160, 280);
            ctx.restore();
          }
        }
      };
      drawDropper(delilaImg);
      return;
    }

    // ── Pump & Jar: drawn shapes ───────────────────────────────────────────
    function drawBase() {
      if (bottleKey === "pump") {
        rr(ctx!, 98, 148, 124, 320, 12); ctx!.fillStyle = "#CBC0B4"; ctx!.fill();
        ctx!.beginPath(); ctx!.moveTo(136, 128); ctx!.lineTo(98, 148); ctx!.lineTo(222, 148); ctx!.lineTo(184, 128); ctx!.closePath();
        ctx!.fillStyle = "#BFB5AA"; ctx!.fill();
        ctx!.fillStyle = "#B3AAA0"; ctx!.fillRect(151, 80, 18, 52);
        rr(ctx!, 128, 58, 64, 26, 4); ctx!.fillStyle = "#292622"; ctx!.fill();
        ctx!.fillStyle = "#292622"; ctx!.fillRect(188, 62, 34, 12);
      } else {
        rr(ctx!, 76, 110, 168, 52, 6); ctx!.fillStyle = "#292622"; ctx!.fill();
        ctx!.fillStyle = "#1A1816"; ctx!.fillRect(76, 155, 168, 8);
        rr(ctx!, 78, 163, 164, 280, 10); ctx!.fillStyle = "#CBC0B4"; ctx!.fill();
      }
    }

    function drawHighlights() {
      ctx!.save(); ctx!.globalAlpha = 0.13; ctx!.fillStyle = "#fff";
      if (bottleKey === "pump") { rr(ctx!, 108, 155, 14, 298, 7); ctx!.fill(); }
      else { rr(ctx!, 90, 170, 14, 262, 7); ctx!.fill(); }
      ctx!.restore();
    }

    const AREAS: Record<string, [number, number, number, number]> = {
      pump: [100, 155, 120, 295],
      jar:  [82, 170, 156, 255],
    };

    drawBase();

    const [lx, ly, lw, lh] = AREAS[bottleKey];
    if (!logoUrl) {
      ctx.save();
      ctx.strokeStyle = "rgba(201,184,168,0.35)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(lx + 10, ly + 10, lw - 20, lh - 20);
      ctx.fillStyle = "rgba(201,184,168,0.45)";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UPLOAD LOGO", lx + lw / 2, ly + lh / 2);
      ctx.restore();
      drawHighlights();
      return;
    }

    const logoImg = new window.Image();
    logoImg.onload = () => {
      warpLogo(ctx, logoImg, lx, ly, lw, lh, () => {
        if (bottleKey === "pump") rr(ctx, 98, 148, 124, 320, 12);
        else rr(ctx, 78, 163, 164, 280, 10);
      });
      drawHighlights();
    };
    logoImg.src = logoUrl;
  }, [logoUrl, bottleKey, delilaImg]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>1. Upload your logo</p>
          <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed cursor-pointer transition-colors hover:border-[#C9B8A8]" style={{ borderColor: "#4A4540", borderRadius: "2px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-xs" style={{ color: "#9E8F83" }}>
              {logoUrl ? "Change logo" : "PNG or SVG · transparent background works best"}
            </span>
            <input type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={handleFile} className="hidden" />
          </label>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>2. Choose a bottle shape</p>
          <div className="flex gap-3">
            {(["dropper", "pump", "jar"] as const).map((k) => (
              <button key={k} onClick={() => setBottleKey(k)} className="text-xs px-4 py-2 border transition-colors capitalize" style={{ borderColor: bottleKey === k ? "#FAF8F5" : "#4A4540", color: bottleKey === k ? "#FAF8F5" : "#9E8F83", borderRadius: "2px" }}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: "#4A4540", lineHeight: 1.8 }}>
          {logoUrl
            ? "Logo mapped using cylindrical projection — pixels are warped so the artwork follows the curve of the bottle, with edge shading to simulate light falloff. A formal print proof is sent before production."
            : "Upload your logo above to see how it wraps around the bottle surface. PNG with a transparent background gives the best result."}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ borderRadius: "4px", backgroundColor: "#1E1C19", maxWidth: "300px", width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}

export default function CustomisePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const techniquesRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.querySelectorAll(".hero-animate"), {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
        });
      }

      if (techniquesRef.current) {
        gsap.from(techniquesRef.current.querySelectorAll(".technique-card"), {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: techniquesRef.current,
            start: "top 70%",
          },
        });
      }

      if (stepsRef.current) {
        gsap.from(stepsRef.current.querySelectorAll("li"), {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: stepsRef.current,
            start: "top 70%",
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef}
        className="py-16 md:py-20 px-4"
        style={{ backgroundColor: "#FAF8F5" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="hero-animate text-xs uppercase tracking-widest mb-4"
            style={{ color: "#C9B8A8" }}
          >
            Customisation
          </p>
          <h1
            className="hero-animate text-6xl md:text-7xl leading-none mb-8"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            make it
            <br />
            undeniably
            <br />
            yours.
          </h1>
          <p
            className="hero-animate text-lg max-w-xl"
            style={{ color: "#4A4540", lineHeight: 1.8 }}
          >
            Add your brand identity directly to the packaging. From 100 units,
            shipped from our China supplier in 4–6 weeks.
          </p>
        </div>
      </section>

      {/* Logo Preview Tool */}
      <section className="py-20 px-4" style={{ backgroundColor: "#1C1A17" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>Preview tool</p>
          <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#FAF8F5" }}>
            see your logo on a bottle
          </h2>
          <p className="text-sm mb-10 max-w-lg" style={{ color: "#9E8F83", lineHeight: 1.8 }}>
            Upload a PNG or SVG of your logo and see roughly how it will look on packaging. This is an approximate preview — a formal print proof is provided before production.
          </p>
          <LogoPreviewTool />
        </div>
      </section>

      {/* Techniques */}
      <section className="py-20 px-4" style={{ backgroundColor: "#E8DDD0" }}>
        <div ref={techniquesRef} className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            techniques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TECHNIQUES.map((t) => (
              <div
                key={t.name}
                className="technique-card p-8 border"
                style={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#C9B8A8",
                  borderRadius: "2px",
                }}
              >
                <h3
                  className="text-2xl mb-3"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 300,
                    color: "#1C1A17",
                  }}
                >
                  {t.name}
                </h3>
                <p
                  className="text-sm mb-6"
                  style={{ color: "#4A4540", lineHeight: 1.8 }}
                >
                  {t.description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      MOQ
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.moq} units</p>
                  </div>
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      Lead time
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.lead}</p>
                  </div>
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      From
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.startingFrom}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            how it works
          </h2>
          <ol ref={stepsRef} className="space-y-8">
            {[
              {
                step: "01",
                heading: "Choose your bottle",
                body: "Browse the shop and select your packaging. Add 100+ units to your cart.",
              },
              {
                step: "02",
                heading: "Select a print technique",
                body: "On the product page, choose silk screen or hot stamp and add it to your order.",
              },
              {
                step: "03",
                heading: "Send your artwork",
                body: "After checkout we'll email you a brief with file format specs (PDF/AI, vector).",
              },
              {
                step: "04",
                heading: "Proof and produce",
                body: "We send a digital proof for your approval. Production begins once confirmed.",
              },
              {
                step: "05",
                heading: "Delivered to your door",
                body: "Your branded packaging ships from China and arrives in 4–6 weeks.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-8 items-start">
                <span
                  className="text-3xl shrink-0 w-12"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 300,
                    color: "#C9B8A8",
                  }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-medium mb-1" style={{ color: "#1C1A17" }}>
                    {item.heading}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "#4A4540", lineHeight: 1.8 }}
                  >
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-4 text-center"
        style={{ backgroundColor: "#EDD8D2" }}
      >
        <h2
          className="text-4xl mb-6"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            color: "#1C1A17",
          }}
        >
          ready to start?
        </h2>
        <p
          className="text-sm mb-10 max-w-md mx-auto"
          style={{ color: "#4A4540", lineHeight: 1.8 }}
        >
          Select your packaging, choose a print technique at checkout, and we
          handle the rest.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center px-10 py-4 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#1C1A17",
            color: "#FAF8F5",
            borderRadius: "2px",
          }}
        >
          Shop packaging →
        </Link>
      </section>
    </>
  );
}
