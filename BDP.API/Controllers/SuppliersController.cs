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
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            Website = dto.Website,
            LeadTimeDays = dto.LeadTimeDays,
            MinOrderQuantity = dto.MinOrderQuantity,
            OffersCustomisation = dto.OffersCustomisation,
            Notes = dto.Notes,
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
        supplier.ContactEmail = dto.ContactEmail;
        supplier.ContactPhone = dto.ContactPhone;
        supplier.Website = dto.Website;
        supplier.LeadTimeDays = dto.LeadTimeDays;
        supplier.MinOrderQuantity = dto.MinOrderQuantity;
        supplier.OffersCustomisation = dto.OffersCustomisation;
        supplier.Notes = dto.Notes;

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
        ContactEmail = s.ContactEmail,
        ContactPhone = s.ContactPhone,
        Website = s.Website,
        LeadTimeDays = s.LeadTimeDays,
        MinOrderQuantity = s.MinOrderQuantity,
        OffersCustomisation = s.OffersCustomisation,
        Notes = s.Notes,
        CreatedAt = s.CreatedAt,
        ProductCount = s.Products?.Count ?? 0,
        CustomisationOptionCount = s.CustomisationOptions?.Count ?? 0,
    };

    private static SupplierDetailDto MapToDetailDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Country = s.Country,
        ContactEmail = s.ContactEmail,
        ContactPhone = s.ContactPhone,
        Website = s.Website,
        LeadTimeDays = s.LeadTimeDays,
        MinOrderQuantity = s.MinOrderQuantity,
        OffersCustomisation = s.OffersCustomisation,
        Notes = s.Notes,
        CreatedAt = s.CreatedAt,
        ProductCount = s.Products?.Count ?? 0,
        CustomisationOptionCount = s.CustomisationOptions?.Count ?? 0,
        Products = s.Products?.Select(p => new ProductSummaryDto
        {
            Id = p.Id,
            Name = p.Name,
            SKUBase = p.SKUBase,
            Category = p.Category,
            SizeML = p.SizeML,
            BottleColour = p.BottleColour,
            LidColour = p.LidColour,
            IsActive = p.IsActive,
        }).ToList() ?? new(),
        CustomisationOptions = s.CustomisationOptions?.OrderBy(co => co.Type).ThenBy(co => co.MinQuantity)
            .Select(co => new CustomisationOptionDto
            {
                Id = co.Id,
                SupplierId = co.SupplierId,
                SupplierName = s.Name,
                Type = co.Type.ToString(),
                MinQuantity = co.MinQuantity,
                TotalPriceZAR = co.TotalPriceZAR,
                Notes = co.Notes,
            }).ToList() ?? new(),
    };
}
