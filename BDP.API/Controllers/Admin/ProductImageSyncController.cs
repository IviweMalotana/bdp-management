using BDP.API.Data;
using BDP.API.Models;
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
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (compatible; BDP-Sync/1.0)");

        string csv = string.Empty;
        var urls = new[]
        {
            $"https://docs.google.com/spreadsheets/d/{SheetId}/export?format=csv&gid=0",
            $"https://docs.google.com/spreadsheets/d/{SheetId}/pub?output=csv&gid=0",
            $"https://docs.google.com/spreadsheets/d/{SheetId}/gviz/tq?tqx=out:csv&gid=0"
        };

        int lastStatus = 0;
        bool fetched = false;
        foreach (var url in urls)
        {
            try
            {
                var response = await client.GetAsync(url);
                lastStatus = (int)response.StatusCode;
                if (response.IsSuccessStatusCode)
                {
                    csv = await response.Content.ReadAsStringAsync();
                    fetched = true;
                    break;
                }
            }
            catch { }
        }

        if (!fetched)
        {
            if (lastStatus == 401 || lastStatus == 403)
                return StatusCode(400, "Google Sheet access denied (HTTP " + lastStatus + "). Please publish: File > Share > Publish to web > CSV > Publish.");
            return StatusCode(502, $"Failed to fetch sheet (HTTP {lastStatus}).");
        }

        return await ProcessCsv(csv);
    }

    [HttpPost("sync-images-from-csv")]
    public async Task<IActionResult> SyncImagesFromCsv([FromBody] SyncFromCsvRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.CsvContent))
            return BadRequest("CSV content is required.");
        return await ProcessCsv(request.CsvContent);
    }

    private async Task<IActionResult> ProcessCsv(string csv)
    {
        var rows = ParseCsv(csv);
        if (rows.Count < 2) return BadRequest("Sheet appears empty.");

        var headers = rows[0];
        int skuCol = IndexOf(headers, "SKU_ID");
        int imageCol = IndexOf(headers, "Cleaned White");

        if (skuCol < 0 || imageCol < 0)
            return BadRequest($"Missing columns (SKU_ID, Cleaned White). Found: {string.Join(", ", headers)}");

        var variants = await _db.ProductVariants
            .Where(v => v.SkuId != null)
            .Select(v => new { v.SkuId, v.ProductId })
            .ToListAsync();

        var skuToProduct = variants
            .GroupBy(v => v.SkuId!)
            .ToDictionary(g => g.Key, g => g.First().ProductId);

        var productIds = skuToProduct.Values.Distinct().ToList();
        var existingImages = await _db.ProductImages
            .Where(img => productIds.Contains(img.ProductId) && img.IsPrimary)
            .ToListAsync();
        var primaryImageByProduct = existingImages.ToDictionary(img => img.ProductId);

        int updated = 0;
        var newImages = new List<ProductImage>();

        for (int i = 1; i < rows.Count; i++)
        {
            var row = rows[i];
            if (row.Count <= Math.Max(skuCol, imageCol)) continue;

            var sku = row[skuCol].Trim();
            var rawImageUrl = row[imageCol].Trim();

            if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(rawImageUrl)) continue;
            if (!skuToProduct.TryGetValue(sku, out var productId)) continue;

            var embeddable = ToEmbeddableUrl(rawImageUrl);
            if (embeddable == null) continue;

            if (primaryImageByProduct.TryGetValue(productId, out var existingImg))
            {
                existingImg.Url = embeddable;
                updated++;
            }
            else if (!newImages.Any(n => n.ProductId == productId))
            {
                newImages.Add(new ProductImage
                {
                    ProductId = productId,
                    Url = embeddable,
                    AltText = "Product Image",
                    IsPrimary = true,
                    SortOrder = 0
                });
                updated++;
            }
        }

        if (newImages.Count > 0)
            _db.ProductImages.AddRange(newImages);

        await _db.SaveChangesAsync();
        return Ok(new { updated, total = rows.Count - 1 });
    }

    private static string? ToEmbeddableUrl(string url)
    {
        var match = Regex.Match(url, @"drive.google.com/file/d/([^/]+)");
        if (match.Success)
            return $"https://drive.google.com/uc?export=view&id={match.Groups[1].Value}";

        match = Regex.Match(url, @"id=([^&]+)");
        if (match.Success)
            return $"https://drive.google.com/uc?export=view&id={match.Groups[1].Value}";

        return null;
    }

    private static int IndexOf(List<string> headers, string name)
    {
        for (int i = 0; i < headers.Count; i++)
            if (string.Equals(headers[i].Trim(), name, StringComparison.OrdinalIgnoreCase))
                return i;
        return -1;
    }

    private static List<List<string>> ParseCsv(string csv)
    {
        var rows = new List<List<string>>();
        var lines = csv.Split('\n');
        foreach (var line in lines)
        {
            var row = new List<string>();
            bool inQuotes = false;
            var cell = new System.Text.StringBuilder();
            foreach (var ch in line)
            {
                if (ch == '"') { inQuotes = !inQuotes; }
                else if (ch == ',' && !inQuotes) { row.Add(cell.ToString()); cell.Clear(); }
                else { cell.Append(ch); }
            }
            row.Add(cell.ToString().TrimEnd('\r'));
            if (row.Count > 1 || (row.Count == 1 && row[0].Length > 0))
                rows.Add(row);
        }
        return rows;
    }
}

public class SyncFromCsvRequest
{
    public string? CsvContent { get; set; }
}
