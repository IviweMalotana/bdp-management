namespace BDP.API.Services;

public static class ProductSeoGenerator
{
    // ── Industry mappings ────────────────────────────────────────────────────

    private static string IndustriesForProductType(string? productType)
    {
        var pt = productType?.ToLowerInvariant() ?? "";
        if (pt.Contains("cream jar"))
            return "skincare brands, body butter makers, wellness brands, hotels and spas";
        if (pt.Contains("dropper") || pt.Contains("essential oil"))
            return "aromatherapy, spa, wellness, perfume brands and essential oil suppliers";
        if (pt.Contains("serum"))
            return "skincare brands, facial oil manufacturers and beauty brands";
        if (pt.Contains("pump") || pt.Contains("lotion"))
            return "skincare, haircare, hotels, hospitality and private label brands";
        if (pt.Contains("spray"))
            return "perfume brands, room spray makers, toner producers and hotels";
        return "cosmetic packaging brands, beauty brands and private label businesses";
    }

    private static string SustainabilityForMaterial(string? material)
    {
        var m = material?.ToLowerInvariant() ?? "";
        if (m.Contains("glass")) return "premium, sustainable and fully recyclable";
        if (m.Contains("pet") || m.Contains("plastic")) return "lightweight, durable and shatterproof";
        return "durable and reliable";
    }

    private static string AestheticForFinish(string? finish)
    {
        var f = finish?.ToLowerInvariant() ?? "";
        if (f.Contains("frosted")) return "frosted matte finish with understated luxury";
        if (f.Contains("glossy") || f.Contains("gloss")) return "sleek, glossy modern finish";
        if (f.Contains("sandblasted")) return "artisanal sandblasted finish with spa-quality texture";
        return string.IsNullOrWhiteSpace(finish) ? "" : $"{finish} finish";
    }

    private static string UseCaseForClosure(string? closure)
    {
        var c = closure?.ToLowerInvariant() ?? "";
        if (c.Contains("dropper")) return "precise serum and essential oil application";
        if (c.Contains("pump")) return "hygienic measured dispensing of lotions and shampoos";
        if (c.Contains("spray")) return "fine mist dispensing — ideal for fragrances and toners";
        if (c.Contains("screw")) return "secure, resealable and travel-friendly storage";
        return string.IsNullOrWhiteSpace(closure) ? "" : $"{closure} closure";
    }

    // ── Display title ────────────────────────────────────────────────────────

    /// <summary>Builds a descriptive display title, e.g. "30ml Frosted Glass Serum Bottle".</summary>
    public static string GenerateDisplayTitle(CatalogueRow firstRow)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(firstRow.Specification_Size))
            parts.Add(firstRow.Specification_Size.Trim());

        if (!string.IsNullOrWhiteSpace(firstRow.Base_Body_Finish))
            parts.Add(firstRow.Base_Body_Finish.Trim());

        if (!string.IsNullOrWhiteSpace(firstRow.Body_Material))
            parts.Add(firstRow.Body_Material.Trim());

        if (!string.IsNullOrWhiteSpace(firstRow.Product_Type))
            parts.Add(firstRow.Product_Type.Trim());

        return parts.Count > 0
            ? string.Join(" ", parts)
            : firstRow.Product_Name?.Trim() ?? "Cosmetic Packaging";
    }

    // ── SEO title (max 70 chars) ─────────────────────────────────────────────

    /// <summary>Builds a keyword-rich SEO title capped at 70 characters.</summary>
    public static string GenerateSeoTitle(CatalogueRow firstRow)
    {
        var displayTitle = GenerateDisplayTitle(firstRow);
        var suffix = " | Cosmetic Packaging Wholesale South Africa";
        var full = displayTitle + suffix;
        return full.Length <= 70 ? full : (displayTitle.Length > 70 ? displayTitle[..70] : displayTitle);
    }

    // ── Description (2-3 sentences) ─────────────────────────────────────────

    /// <summary>Generates a buyer-facing 2–3 sentence product description.</summary>
    public static string GenerateDescription(CatalogueRow firstRow, IEnumerable<CatalogueRow> allVariants)
    {
        var variantList = allVariants.ToList();
        var displayTitle = GenerateDisplayTitle(firstRow);
        var industries = IndustriesForProductType(firstRow.Product_Type);
        var sustainability = SustainabilityForMaterial(firstRow.Body_Material);
        var aesthetic = AestheticForFinish(firstRow.Base_Body_Finish);
        var useCase = UseCaseForClosure(firstRow.Closure_Type);

        var sentence1Parts = new List<string> { $"A {sustainability}" };
        if (!string.IsNullOrWhiteSpace(aesthetic)) sentence1Parts.Add(aesthetic);
        sentence1Parts.Add($"{displayTitle.ToLower()} — ideal for {industries}.");
        var sentence1 = string.Join(", ", sentence1Parts.Take(2)) + " " + sentence1Parts.Last();

        // Variant count and sample names
        var variantCount = variantList.Count;
        var sampleNames = variantList
            .Where(v => !string.IsNullOrWhiteSpace(v.Color_Variant_Name))
            .Select(v => v.Color_Variant_Name!.Trim())
            .Distinct()
            .Take(3)
            .ToList();

        string sentence2;
        if (variantCount > 1 && sampleNames.Any())
        {
            var sampleStr = string.Join(", ", sampleNames);
            sentence2 = $"Available in {variantCount} colour and finish combination{(variantCount > 1 ? "s" : "")} including {sampleStr}.";
        }
        else if (variantCount > 1)
        {
            sentence2 = $"Available in {variantCount} colour and finish combinations.";
        }
        else
        {
            sentence2 = string.IsNullOrWhiteSpace(useCase)
                ? "Suitable for a wide range of cosmetic and wellness formulations."
                : $"Designed for {useCase}.";
        }

        var sentence3 = "Minimum order 10 units with wholesale pricing and optional silk screen printing or hot stamping from 1,000 units.";

        return $"{sentence1} {sentence2} {sentence3}";
    }

    // ── Meta description (max 155 chars) ────────────────────────────────────

    /// <summary>Generates a keyword-rich meta description capped at 155 characters.</summary>
    public static string GenerateMetaDescription(CatalogueRow firstRow)
    {
        var displayTitle = GenerateDisplayTitle(firstRow).ToLower();
        var closure = firstRow.Closure_Type?.Trim();
        var industries = IndustriesForProductType(firstRow.Product_Type);

        var full = $"Wholesale {displayTitle}{(string.IsNullOrWhiteSpace(closure) ? "" : $" with {closure.ToLower()}")}. Ideal for {industries}. MOQ 10 units. Silk screen & hot stamping available. Supplier South Africa.";
        return full.Length <= 155 ? full : full[..155];
    }

    // ── Meta keywords ────────────────────────────────────────────────────────

    /// <summary>Generates a comma-separated list of 10–15 SEO keywords.</summary>
    public static string GenerateMetaKeywords(CatalogueRow firstRow)
    {
        var size = firstRow.Specification_Size?.Trim() ?? "";
        var material = firstRow.Body_Material?.Trim() ?? "";
        var finish = firstRow.Base_Body_Finish?.Trim() ?? "";
        var productType = firstRow.Product_Type?.Trim() ?? "";
        var closure = firstRow.Closure_Type?.Trim() ?? "";

        var keywords = new List<string>();

        // Size + product type
        if (!string.IsNullOrWhiteSpace(size) && !string.IsNullOrWhiteSpace(productType))
            keywords.Add($"{size} {productType.ToLower()}");

        // Finish + material + product type
        if (!string.IsNullOrWhiteSpace(finish) && !string.IsNullOrWhiteSpace(material))
            keywords.Add($"{finish.ToLower()} {material.ToLower()} {productType.ToLower()}".Trim());

        // Generic product type wholesale
        if (!string.IsNullOrWhiteSpace(productType))
        {
            keywords.Add($"{productType.ToLower()} wholesale");
            keywords.Add($"{productType.ToLower()} supplier");
            keywords.Add($"cosmetic packaging {productType.ToLower()}");
        }

        // Industry-specific
        var pt = productType.ToLowerInvariant();
        if (pt.Contains("serum"))
        {
            keywords.Add("skincare packaging wholesale");
            keywords.Add("serum bottle supplier");
        }
        else if (pt.Contains("cream jar"))
        {
            keywords.Add("skincare packaging wholesale");
            keywords.Add("cream jar supplier");
        }
        else if (pt.Contains("dropper"))
        {
            keywords.Add("essential oil packaging");
            keywords.Add("dropper bottle supplier");
        }
        else if (pt.Contains("pump"))
        {
            keywords.Add("lotion bottle wholesale");
            keywords.Add("pump bottle supplier");
        }
        else
        {
            keywords.Add("cosmetic packaging wholesale");
            keywords.Add("beauty packaging supplier");
        }

        // Closure
        if (!string.IsNullOrWhiteSpace(closure))
            keywords.Add($"{closure.ToLower()} packaging");

        // Always-on geo + trade
        keywords.Add("cosmetic packaging South Africa");
        keywords.Add("wholesale packaging supplier");
        keywords.Add("bulk cosmetic bottles");
        keywords.Add("private label packaging");

        // Deduplicate and cap at 15
        return string.Join(", ", keywords.Distinct().Take(15));
    }

    // ── Overloads that work from product fields (for refresh-seo endpoint) ───

    public static string GenerateDisplayTitleFromFields(string? size, string? finish, string? material, string? productType)
    {
        var row = new CatalogueRow
        {
            Specification_Size = size,
            Base_Body_Finish = finish,
            Body_Material = material,
            Product_Type = productType,
        };
        return GenerateDisplayTitle(row);
    }

    public static string GenerateSeoTitleFromFields(string? size, string? finish, string? material, string? productType)
    {
        var row = new CatalogueRow
        {
            Specification_Size = size,
            Base_Body_Finish = finish,
            Body_Material = material,
            Product_Type = productType,
        };
        return GenerateSeoTitle(row);
    }

    public static string GenerateMetaDescriptionFromFields(string? size, string? finish, string? material, string? productType, string? closure)
    {
        var row = new CatalogueRow
        {
            Specification_Size = size,
            Base_Body_Finish = finish,
            Body_Material = material,
            Product_Type = productType,
            Closure_Type = closure,
        };
        return GenerateMetaDescription(row);
    }

    public static string GenerateMetaKeywordsFromFields(string? size, string? finish, string? material, string? productType, string? closure)
    {
        var row = new CatalogueRow
        {
            Specification_Size = size,
            Base_Body_Finish = finish,
            Body_Material = material,
            Product_Type = productType,
            Closure_Type = closure,
        };
        return GenerateMetaKeywords(row);
    }

    public static string GenerateDescriptionFromFields(
        string? size, string? finish, string? material, string? productType, string? closure,
        int variantCount, IEnumerable<string> sampleVariantNames)
    {
        var sampleList = sampleVariantNames.ToList();
        var displayTitle = GenerateDisplayTitleFromFields(size, finish, material, productType);
        var industries = IndustriesForProductType(productType);
        var sustainability = SustainabilityForMaterial(material);
        var aesthetic = AestheticForFinish(finish);
        var useCase = UseCaseForClosure(closure);

        var sentence1Parts = new List<string> { $"A {sustainability}" };
        if (!string.IsNullOrWhiteSpace(aesthetic)) sentence1Parts.Add(aesthetic);
        sentence1Parts.Add($"{displayTitle.ToLower()} — ideal for {industries}.");
        var sentence1 = string.Join(", ", sentence1Parts.Take(2)) + " " + sentence1Parts.Last();

        string sentence2;
        if (variantCount > 1 && sampleList.Any())
        {
            var sampleStr = string.Join(", ", sampleList.Take(3));
            sentence2 = $"Available in {variantCount} colour and finish combination{(variantCount > 1 ? "s" : "")} including {sampleStr}.";
        }
        else if (variantCount > 1)
        {
            sentence2 = $"Available in {variantCount} colour and finish combinations.";
        }
        else
        {
            sentence2 = string.IsNullOrWhiteSpace(useCase)
                ? "Suitable for a wide range of cosmetic and wellness formulations."
                : $"Designed for {useCase}.";
        }

        var sentence3 = "Minimum order 10 units with wholesale pricing and optional silk screen printing or hot stamping from 1,000 units.";
        return $"{sentence1} {sentence2} {sentence3}";
    }
}
