using BDP.API.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace BDP.API.Services;

public class ShopifyExportService
{
    private readonly AppDbContext _context;

    public ShopifyExportService(AppDbContext context) => _context = context;

    public async Task<byte[]> ExportToCsv(List<int> productIds)
    {
        var products = await _context.Products
            .Include(p => p.PricingTiers)
            .Include(p => p.Supplier)
            .Where(p => productIds.Contains(p.Id))
            .OrderBy(p => p.Name)
            .ToListAsync();

        var sb = new StringBuilder();

        // Header
        sb.AppendLine(string.Join(",", new[]
        {
            "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
            "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
            "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams",
            "Variant Inventory Tracker", "Variant Inventory Policy", "Variant Fulfillment Service",
            "Variant Price", "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable",
            "Unit Price Total Measure", "Unit Price Total Measure Unit",
            "Unit Price Base Measure", "Unit Price Base Measure Unit",
            "Variant Barcode", "Image Src", "Image Position", "Image Alt Text",
            "Gift Card", "SEO Title", "SEO Description", "Status", "Cost per item"
        }.Select(CsvQuote)));

        foreach (var product in products)
        {
            var handle = product.Name.ToLowerInvariant().Replace(" ", "-");
            var tiers = product.PricingTiers.OrderBy(t => t.Quantity).ToList();
            var type = product.Category.ToLowerInvariant();

            if (!tiers.Any())
            {
                // Emit one row with no variant data
                sb.AppendLine(BuildRow(handle, product.Name,
                    product.ShopifyBodyHtml ?? string.Empty,
                    product.Supplier?.Name ?? string.Empty,
                    product.Category, type,
                    $"{product.SizeML}ml", product.Texture, "—",
                    string.Empty, 0, 0m, 0m, 0m, 0m, isFirst: true));
                continue;
            }

            bool isFirst = true;
            foreach (var tier in tiers)
            {
                sb.AppendLine(BuildRow(
                    handle,
                    isFirst ? product.Name : string.Empty,
                    isFirst ? (product.ShopifyBodyHtml ?? string.Empty) : string.Empty,
                    product.Supplier?.Name ?? string.Empty,
                    product.Category, type,
                    $"{product.SizeML}ml", product.Texture, tier.Quantity.ToString(),
                    tier.SKU,
                    tier.Quantity,
                    tier.TotalSalePrice,
                    tier.CompareAtPrice > 0 ? tier.CompareAtPrice : tier.TotalSalePrice,
                    tier.TotalCostPrice,
                    tier.Quantity * 400m,
                    isFirst));
                isFirst = false;
            }
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string BuildRow(
        string handle, string title, string bodyHtml,
        string vendor, string category, string type,
        string size, string texture, string qty,
        string sku, int variantQty, decimal price, decimal compareAt,
        decimal cost, decimal grams, bool isFirst)
    {
        return string.Join(",", new[]
        {
            CsvQuote(handle),
            CsvQuote(isFirst ? title : string.Empty),
            CsvQuote(isFirst ? bodyHtml : string.Empty),
            CsvQuote(vendor),
            CsvQuote("Cosmetic Containers"),
            CsvQuote(type),
            CsvQuote(string.Empty),
            "TRUE",
            CsvQuote("Size"),
            CsvQuote(size),
            CsvQuote("Texture"),
            CsvQuote(texture),
            CsvQuote("Quantity"),
            CsvQuote(qty),
            CsvQuote(sku),
            grams.ToString("0"),
            CsvQuote("shopify"),
            CsvQuote("continue"),
            CsvQuote("manual"),
            price.ToString("0.00"),
            compareAt > 0 ? compareAt.ToString("0.00") : string.Empty,
            "TRUE",
            "FALSE",
            variantQty.ToString(),
            CsvQuote("item"),
            "1",
            CsvQuote("item"),
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty,
            "FALSE",
            CsvQuote(title),
            string.Empty,
            CsvQuote("active"),
            cost.ToString("0.00"),
        });
    }

    private static string CsvQuote(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
