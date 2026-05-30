using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Admin;

[ApiController]
[Route("api/admin/catalogue")]
[Authorize(Roles = "Admin,Manager")]
public class CatalogueController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CatalogueImportService _importService;

    public CatalogueController(AppDbContext db, CatalogueImportService importService)
    {
        _db = db;
        _importService = importService;
    }

    /// <summary>
    /// POST /api/admin/catalogue/import
    /// Accepts multipart/form-data with a "file" field (CSV).
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> ImportCsv(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided. Please upload a CSV file." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
            return BadRequest(new { message = "Only CSV files are accepted." });

        await using var stream = file.OpenReadStream();
        var result = await _importService.ImportFromStreamAsync(stream);

        return Ok(new
        {
            added = result.Added,
            updated = result.Updated,
            unchanged = result.Unchanged,
            errors = result.Errors,
            success = result.Errors.Count == 0,
        });
    }

    /// <summary>
    /// GET /api/admin/catalogue/products
    /// Returns paginated product list with variant count.
    /// </summary>
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.Products
            .Include(p => p.Variants)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.Name.Contains(search) ||
                (p.SupplierItemNumber != null && p.SupplierItemNumber.Contains(search)) ||
                p.Variants.Any(v => v.SkuId != null && v.SkuId.Contains(search)));
        }

        var total = await query.CountAsync();
        var products = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = products.Select(p => new
        {
            p.Id,
            p.Name,
            p.Slug,
            p.Category,
            p.SupplierItemNumber,
            p.ProductType,
            p.ShapeStyle,
            supplierName = p.Supplier?.Name,
            variantCount = p.Variants.Count,
            variants = p.Variants.Select(v => new
            {
                v.Id,
                v.SkuId,
                v.SKU,
                v.SpecificationSize,
                v.BaseBodyColor,
                v.LidCapColor,
                v.UnitPriceCNY,
                v.SupplierMoq,
                v.IsActive,
            }),
        });

        return Ok(new { total, page, pageSize, items });
    }
}
