-- ============================================================
-- Patch 002: Seed primary product images
-- Uses Unsplash photos curated for cosmetic packaging.
-- Run once in Neon SQL console or via psql.
-- ============================================================

-- Helper: only insert if no images exist for the product yet
DO $$
DECLARE
  v_id INT;
BEGIN

  -- ── Devin (Serum, 30ml Black Matte dropper) ──────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'devin-serum';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=85&fit=crop&auto=format',
       'Devin 30ml black matte serum dropper bottle', 1, true),
      (v_id, 'https://images.unsplash.com/photo-1571781565036-d3f759be73e4?w=900&q=85&fit=crop&auto=format',
       'Devin dropper bottle detail', 2, false);
  END IF;

  -- ── Darla (Pump, 30ml Clear/White) ───────────────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'darla-pump';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&q=85&fit=crop&auto=format',
       'Darla 30ml clear pump bottle with white lid', 1, true),
      (v_id, 'https://images.unsplash.com/photo-1601049301025-9f5a56bbab1d?w=900&q=85&fit=crop&auto=format',
       'Darla pump bottle lifestyle shot', 2, false);
  END IF;

  -- ── Delphi (Pump, 30ml Clear/White) ──────────────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'delphi-pump';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=900&q=85&fit=crop&auto=format',
       'Delphi 30ml clear pump bottle', 1, true);
  END IF;

  -- ── Dawn (Serum, 30ml Clear/Silver) ──────────────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'dawn-serum';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1590156562745-5dd38e547bce?w=900&q=85&fit=crop&auto=format',
       'Dawn 30ml clear serum dropper with silver lid', 1, true),
      (v_id, 'https://images.unsplash.com/photo-1571781565036-d3f759be73e4?w=900&q=85&fit=crop&auto=format',
       'Dawn serum bottle close-up', 2, false);
  END IF;

  -- ── Danica (Serum, 30ml Orange/White/Frosted) ─────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'danica-serum';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=85&fit=crop&auto=format',
       'Danica 30ml frosted orange serum bottle', 1, true);
  END IF;

  -- ── Aurora (Pump, 30ml Clear/White/Frosted) ───────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'aurora-pump';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=900&q=85&fit=crop&auto=format',
       'Aurora 30ml frosted clear pump bottle', 1, true),
      (v_id, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=900&q=85&fit=crop&auto=format',
       'Aurora pump bottle product shot', 2, false);
  END IF;

  -- ── Daphne (Jar, 30g and 50g) ────────────────────────────────────────────
  SELECT "Id" INTO v_id FROM "Products" WHERE "Slug" = 'daphne-jar';
  IF NOT EXISTS (SELECT 1 FROM "ProductImages" WHERE "ProductId" = v_id) THEN
    INSERT INTO "ProductImages" ("ProductId", "Url", "AltText", "SortOrder", "IsPrimary")
    VALUES
      (v_id, 'https://images.unsplash.com/photo-1617897903246-719242758050?w=900&q=85&fit=crop&auto=format',
       'Daphne 30g clear glass jar with white lid', 1, true),
      (v_id, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=85&fit=crop&auto=format',
       'Daphne cosmetic jar close-up', 2, false);
  END IF;

END $$;

-- Verify
SELECT
  p."Name",
  p."Slug",
  COUNT(pi."Id") AS image_count,
  MAX(CASE WHEN pi."IsPrimary" THEN pi."Url" ELSE NULL END) AS primary_url
FROM "Products" p
LEFT JOIN "ProductImages" pi ON pi."ProductId" = p."Id"
GROUP BY p."Id", p."Name", p."Slug"
ORDER BY p."Name";
