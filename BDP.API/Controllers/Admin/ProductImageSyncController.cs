using BDP.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace BDP.API.Controllers.Admin;

[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = "Admin,Manager")]
public class ProductImageSyncController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _http;

    private const string SheetId = "1IBmXoxiFy2lWtTtLzmeXZghx_y3_pySq5Io3EquNbl8";

    public ProductImageSyncController(AppDbContext db, IHttpClientFactory http)
    {
        _db = db;
        _http = http;
    }

    [HttpPost("sync-images")]
    public async Task<IActionResult> SyncImages()
    {
        var client = _http.CreateClient();
        string csv;
        try
        {
            var response = await client.GetAsync(
                $"https://docs.google.com/spreadsheets/d/{SheetId}/pub?output=csv&gid=0");
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized ||
                response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                return StatusCode(400, "Google Sheet is private. Please set sharing to 'Anyone with the link can view' in Google Sheets, then try again.");
            if (!response.IsSuccessStatusCode)
                return StatusCode(502, $"Failed to fetch sheet: HTTP {(int)response.StatusCode}");
            csv = await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(502, $"Failed to fetch sheet: {ex.Message}");
        }

        var rows = ParseCsv(csv);
        if (rows.Count < 2) return BadRequest("Sheet appears empty.");

        var headers = rows[0];
        int skuCol        = IndexOf(headers, "SKU_ID");
        int productCol    = IndexOf(headers, "Product_Name");
        int imageCol      = IndexOf(headers, "Cleaned White");

        if (skuCol < 0 || imageCol < 0)
            return BadRequest("Sheet is missing required columns (SKU_ID, Cleaned White).");

        // Load all variants with their product IDs
        var variants = await _db.ProductVariants
            .Where(v => v.SkuId != null)
            .Select(v => new { v.SkuId, v.ProductId })
            .ToListAsync();

        var skuToProductId = variants
            .GroupBy(v => v.SkuId!)
            .ToDictionary(g => g.Key, g => g.First().ProductId, StringComparer.OrdinalIgnoreCase);

        // Load existing primary images so we can skip products already synced
        var existingImages = await _db.ProductImages.ToListAsync();

        int synced = 0, skipped = 0, notMatched = 0;

        for (int i = 1; i < rows.Count; i++)
        {
            var row = rows[i];
            var sku      = Cell(row, skuCol);
            var imageUrl = Cell(row, imageCol);
            var name     = Cell(row, productCol);

            if (string.IsNullOrWhiteSpace(sku) || string.IsNullOrWhiteSpace(imageUrl))
            {
                skipped++;
                continue;
            }

            if (!skuToProductId.TryGetValue(sku, out var productId))
            {
                notMatched++;
                continue;
            }

            var embeddable = ToEmbeddableUrl(imageUrl);
            if (embeddable == null) { skipped++; continue; }

            // Remove existing images for this product and replace with synced one
            var existing = existingImages.Where(img => img.ProductId == productId).ToList();
            _db.ProductImages.RemoveRange(existing);

            _db.ProductImages.Add(new BDP.API.Models.ProductImage
            {
                ProductId = productId,
                Url       = embeddable,
                AltText   = name,
                SortOrder = 0,
                IsPrimary = true,
            });

            synced++;
        }

        await _db.SaveChangesAsync();

        return Ok(new { synced, skipped, notMatched, message = $"{synced} products updated, {notMatched} SKUs not found in DB." });
    }

    // ── Sync images from uploaded CSV (for domain-restricted Workspace sheets) ──
    [HttpPost("sync-images-csv")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SyncImagesFromCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Please upload the catalogue CSV file.");
        using var sr = new System.IO.StreamReader(file.OpenReadStream());
        var csv = await sr.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(csv))
            return BadRequest("Uploaded file is empty.");

        var rows = ParseCsv(csv);
        if (rows.Count < 2) return BadRequest("CSV appears empty.");

        var headers      = rows[0];
        var skuCol       = IndexOf(headers, "SKU_ID");
        var imageCol     = IndexOf(headers, "Cleaned White");
        if (skuCol < 0 || imageCol < 0)
            return BadRequest("CSV must have 'SKU_ID' and 'Cleaned White' columns.");

        var existingImages = await _db.ProductImages.ToListAsync();
        var skuToProductId = await _db.ProductVariants
            .Where(v => v.SkuId != null)
            .ToDictionaryAsync(v => v.SkuId!, v => v.ProductId);

        int synced = 0, skipped = 0, notMatched = 0;
        foreach (var row in rows.Skip(1))
        {
            if (row.Count <= Math.Max(skuCol, imageCol)) { skipped++; continue; }
            var sku      = row[skuCol].Trim();
            var imageUrl = row[imageCol].Trim();
            if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(imageUrl)) { skipped++; continue; }

            if (!skuToProductId.TryGetValue(sku, out var productId)) { notMatched++; continue; }

            var embeddable = ToEmbeddableUrl(imageUrl);
            if (embeddable == null) { skipped++; continue; }

            var existing = existingImages.Where(img => img.ProductId == productId).ToList();
            _db.ProductImages.RemoveRange(existing);
            _db.ProductImages.Add(new ProductImage { ProductId = productId, Url = embeddable, AltText = sku, IsPrimary = true });
            synced++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { synced, skipped, notMatched, message = $"{synced} products updated from uploaded CSV." });
    }

    // Extract Drive file ID and return a directly embeddable URL
    private static string? ToEmbeddableUrl(string driveUrl)
    {
        var match = Regex.Match(driveUrl, @"/file/d/([a-zA-Z0-9_-]+)");
        if (!match.Success) return null;
        var fileId = match.Groups[1].Value;
        // lh3.googleusercontent.com/d/{id} renders directly in <img> and Next.js <Image>
        return $"https://lh3.googleusercontent.com/d/{fileId}";
    }

    private static int IndexOf(List<string> headers, string name) =>
        headers.FindIndex(h => h.Trim().Equals(name, StringComparison.OrdinalIgnoreCase));

    private static string Cell(List<string> row, int col) =>
        col >= 0 && col < row.Count ? row[col].Trim() : string.Empty;

    // Minimal RFC 4180 CSV parser (handles quoted fields with commas/newlines)
    private static List<List<string>> ParseCsv(string csv)
    {
        var result = new List<List<string>>();
        var row    = new List<string>();
        var field  = new System.Text.StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < csv.Length; i++)
        {
            char c = csv[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"') { field.Append('"'); i++; }
                    else inQuotes = false;
                }
                else field.Append(c);
            }
            else
            {
                if (c == '"') { inQuotes = true; }
                else if (c == ',') { row.Add(field.ToString()); field.Clear(); }
                else if (c == '\n' || (c == '\r' && i + 1 < csv.Length && csv[i + 1] == '\n'))
                {
                    if (c == '\r') i++;
                    row.Add(field.ToString()); field.Clear();
                    result.Add(row); row = new List<string>();
                }
                else field.Append(c);
            }
        }
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); result.Add(row); }
        return result;
    }
}
