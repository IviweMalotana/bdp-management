"use client";

interface QuantityInputProps {
  value: number;
  min?: number;
  onChange: (n: number) => void;
}

export default function QuantityInput({ value, min = 1, onChange }: QuantityInputProps) {
  return (
    <div className="flex items-center border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
        style={{ color: "#1C1A17" }}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min) onChange(v);
        }}
        className="w-16 text-center text-sm border-x outline-none bg-transparent h-10"
        style={{ borderColor: "#C9B8A8", color: "#1C1A17" }}
      />
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
        style={{ color: "#1C1A17" }}
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
