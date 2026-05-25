"use client";

interface Tier {
  id: number;
  quantity: number;
  salePriceZAR: number;
}

interface PricingTierTableProps {
  tiers: Tier[];
  currentQuantity: number;
}

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PricingTierTable({ tiers, currentQuantity }: PricingTierTableProps) {
  const activeTier = [...tiers]
    .reverse()
    .find((t) => currentQuantity >= t.quantity);

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>
          <th className="py-2 text-left font-medium">Qty</th>
          <th className="py-2 text-right font-medium">Per unit</th>
          <th className="py-2 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((tier) => {
          const isActive = activeTier?.id === tier.id;
          return (
            <tr
              key={tier.id}
              style={{
                backgroundColor: isActive ? "#EDD8D2" : "transparent",
                borderTop: `1px solid #C9B8A8`,
              }}
            >
              <td className="py-2.5 pl-2 font-medium" style={{ color: "#1C1A17" }}>
                {tier.quantity}
              </td>
              <td className="py-2.5 text-right" style={{ color: "#1C1A17" }}>
                {formatZAR(tier.salePriceZAR)}
              </td>
              <td className="py-2.5 pr-2 text-right" style={{ color: "#4A4540" }}>
                {formatZAR(tier.salePriceZAR * currentQuantity)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
