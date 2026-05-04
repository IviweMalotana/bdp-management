using BDP.API.Data;
using BDP.API.DTOs.Customisation;
using BDP.API.DTOs.Products;
using BDP.API.DTOs.Suppliers;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SuppliersController(AppDbContext context) => _context = context;

    // GET /api/suppliers
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _context.Suppliers
            .Include(s => s.Products)
            .Include(s => s.CustomisationOptions)
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(suppliers.Select(MapToDto));
    }

    // GET /api/suppliers/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.Products)
            .Include(s => s.CustomisationOptions)
                .ThenInclude(co => co.PricingTiers)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (supplier == null) return NotFound(new { message = $"Supplier {id} not found." });

        return Ok(MapToDetailDto(supplier));
    }

    // POST /api/suppliers
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = new Supplier
        {
            Name = dto.Name,
            Country = dto.Country,
            Address = dto.Address,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            SuppliesBottles = dto.SuppliesBottles,
            SuppliesCustomisation = dto.SuppliesCustomisation,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, MapToDto(supplier));
    }

    // PUT /api/suppliers/{id}
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound(new { message = $"Supplier {id} not found." });

        supplier.Name = dto.Name;
        supplier.Country = dto.Country;
        supplier.Address = dto.Address;
        supplier.ContactEmail = dto.ContactEmail;
        supplier.ContactPhone = dto.ContactPhone;
        supplier.SuppliesBottles = dto.SuppliesBottles;
        supplier.SuppliesCustomisation = dto.SuppliesCustomisation;
        supplier.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(supplier));
    }

    // DELETE /api/suppliers/{id}
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.Products)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (supplier == null) return NotFound(new { message = $"Supplier {id} not found." });

        if (supplier.Products.Any())
            return Conflict(new { message = $"Cannot delete supplier '{supplier.Name}': {supplier.Products.Count} product(s) are linked to it." });

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Mappers ────────────────────────────────────────────────────────────

    private static SupplierDto MapToDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Country = s.Country,
        Address = s.Address,
        ContactEmail = s.ContactEmail,
        ContactPhone = s.ContactPhone,
        SuppliesBottles = s.SuppliesBottles,
        SuppliesCustomisation = s.SuppliesCustomisation,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        ProductCount = s.Products?.Count ?? 0,
        CustomisationOptionCount = s.CustomisationOptions?.Count ?? 0,
    };

    private static SupplierDetailDto MapToDetailDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Country = s.Country,
        Address = s.Address,
        ContactEmail = s.ContactEmail,
        ContactPhone = s.ContactPhone,
        SuppliesBottles = s.SuppliesBottles,
        SuppliesCustomisation = s.SuppliesCustomisation,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        ProductCount = s.Products?.Count ?? 0,
        CustomisationOptionCount = s.CustomisationOptions?.Count ?? 0,
        Products = s.Products?.Select(p => new ProductSummaryDto
        {
            Id = p.Id,
            Name = p.Name,
            Category = p.Category,
            Slug = p.Slug,
            VariantCount = p.Variants?.Count ?? 0,
        }).ToList() ?? new(),
        CustomisationOptions = s.CustomisationOptions?.OrderBy(co => co.Type).ThenBy(co => co.MinimumQuantity)
            .Select(co => new CustomisationOptionDto
            {
                Id = co.Id,
                SupplierId = co.SupplierId,
                SupplierName = s.Name,
                Type = co.Type,
                Link1688 = co.Link1688,
                MinimumQuantity = co.MinimumQuantity,
                PricingTiers = co.PricingTiers?.OrderBy(t => t.Quantity).Select(t => new CustomisationPricingTierDto
                {
                    Id = t.Id,
                    Quantity = t.Quantity,
                    CostCNY = t.CostCNY,
                    CostWithShippingCNY = t.CostWithShippingCNY,
                    CostPerUnitZAR = t.CostPerUnitZAR,
                    SalePriceZAR = t.SalePriceZAR,
                    SKU = t.SKU,
                }).ToList() ?? new(),
            }).ToList() ?? new(),
    };
}
