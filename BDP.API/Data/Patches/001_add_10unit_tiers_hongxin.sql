-- ============================================================
-- Patch 001: Add 10-unit pricing tiers for Darla, Delphi, Dawn
-- Run once in Neon SQL console: https://console.neon.tech
-- Sale prices derived from 50-unit per-unit × (1.50 / 1.40)
-- ============================================================

-- Darla 30ml Clear/White/Clear  (DAR-30CL-WH-CLR)
-- 50-unit: R600 → R12.00/unit  |  10-unit: R12.00 × 1.0714 = R12.85/unit → R128.50
INSERT INTO "ProductPricingTiers"
    ("ProductVariantId", "Quantity", "CostCNY", "CostWithShippingCNY", "CostWithDutiesCNY",
     "CostPerUnitZAR", "SalePriceZAR", "SKU")
SELECT
    pv."Id",
    10,
    3.50,
    4.50,
    4.50,
    12.05,
    128.50,
    'DAR-30CL-WH-CLR-10'
FROM "ProductVariants" pv
WHERE pv."SKU" = 'DAR-30CL-WH-CLR'
  AND NOT EXISTS (
      SELECT 1 FROM "ProductPricingTiers" t
      WHERE t."ProductVariantId" = pv."Id" AND t."Quantity" = 10
  );

-- Delphi 30ml Clear/White/Clear  (DEL-30CL-WH-CLR)
-- 50-unit: R479.50 → R9.59/unit  |  10-unit: R9.59 × 1.0714 = R10.28/unit → R102.50
INSERT INTO "ProductPricingTiers"
    ("ProductVariantId", "Quantity", "CostCNY", "CostWithShippingCNY", "CostWithDutiesCNY",
     "CostPerUnitZAR", "SalePriceZAR", "SKU")
SELECT
    pv."Id",
    10,
    2.58,
    3.58,
    3.58,
    9.59,
    102.50,
    'DEL-30CL-WH-CLR-10'
FROM "ProductVariants" pv
WHERE pv."SKU" = 'DEL-30CL-WH-CLR'
  AND NOT EXISTS (
      SELECT 1 FROM "ProductPricingTiers" t
      WHERE t."ProductVariantId" = pv."Id" AND t."Quantity" = 10
  );

-- Dawn 30ml Clear/Silver/Clear  (DAW-30CL-SI-CLR)
-- 50-unit: R421.50 → R8.43/unit  |  10-unit: R8.43 × 1.0714 = R9.03/unit → R90.00
INSERT INTO "ProductPricingTiers"
    ("ProductVariantId", "Quantity", "CostCNY", "CostWithShippingCNY", "CostWithDutiesCNY",
     "CostPerUnitZAR", "SalePriceZAR", "SKU")
SELECT
    pv."Id",
    10,
    2.15,
    3.15,
    3.15,
    8.44,
    90.00,
    'DAW-30CL-SI-CLR-10'
FROM "ProductVariants" pv
WHERE pv."SKU" = 'DAW-30CL-SI-CLR'
  AND NOT EXISTS (
      SELECT 1 FROM "ProductPricingTiers" t
      WHERE t."ProductVariantId" = pv."Id" AND t."Quantity" = 10
  );

-- Verify: should return 3 rows (one per product)
SELECT
    p."Name",
    pv."SKU",
    t."Quantity",
    t."SalePriceZAR",
    ROUND(t."SalePriceZAR" / t."Quantity", 2) AS "PerUnitZAR"
FROM "ProductPricingTiers" t
JOIN "ProductVariants" pv ON pv."Id" = t."ProductVariantId"
JOIN "Products" p ON p."Id" = pv."ProductId"
WHERE t."Quantity" = 10
  AND pv."SKU" IN ('DAR-30CL-WH-CLR', 'DEL-30CL-WH-CLR', 'DAW-30CL-SI-CLR')
ORDER BY p."Name";
