using BDP.API.Data;
using BDP.API.DTOs.Products;
using BDP.API.DTOs.Suppliers;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
                .ThenInclude(p => p.PricingTiers)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (supplier == null) return NotFound(new { message = $"Supplier {id} not found." });

        return Ok(new SupplierDetailDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Platform = supplier.Platform,
            Country = supplier.Country,
            ContactEmail = supplier.ContactEmail,
            Notes = supplier.Notes,
            CreatedAt = supplier.CreatedAt,
            ProductCount = supplier.Products.Count,
            Products = supplier.Products.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                SKUBase = p.SKUBase,
                Category = p.Category,
                SizeML = p.SizeML,
                BottleColour = p.BottleColour,
                LidColour = p.LidColour,
                Texture = p.Texture,
                CostCNY = p.CostCNY,
                CostWithShippingCNY = p.CostWithShippingCNY,
                CostPerUnitZAR = p.CostPerUnitZAR,
                SupplierLink = p.SupplierLink,
                SupplierId = p.SupplierId,
                SupplierName = supplier.Name,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                DateAdded = p.DateAdded,
                PricingTiers = p.PricingTiers.Select(ProductsController.MapPricingTierToDto).ToList()
            }).ToList()
        });
    }

    // POST /api/suppliers
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = new Supplier
        {
            Name = dto.Name,
            Platform = dto.Platform,
            Country = dto.Country,
            ContactEmail = dto.ContactEmail,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, MapToDto(supplier));
    }

    // PUT /api/suppliers/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound(new { message = $"Supplier {id} not found." });

        supplier.Name = dto.Name;
        supplier.Platform = dto.Platform;
        supplier.Country = dto.Country;
        supplier.ContactEmail = dto.ContactEmail;
        supplier.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(supplier));
    }

    private static SupplierDto MapToDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Platform = s.Platform,
        Country = s.Country,
        ContactEmail = s.ContactEmail,
        Notes = s.Notes,
        CreatedAt = s.CreatedAt,
        ProductCount = s.Products?.Count ?? 0
    };
}
