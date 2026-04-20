using BDP.API.Data;
using BDP.API.DTOs.Customisation;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomisationController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomisationController(AppDbContext context) => _context = context;

    // GET /api/customisation/supplier/{supplierId}
    [HttpGet("supplier/{supplierId:int}")]
    public async Task<IActionResult> GetBySupplier(int supplierId)
    {
        var supplier = await _context.Suppliers.FindAsync(supplierId);
        if (supplier == null) return NotFound(new { message = $"Supplier {supplierId} not found." });

        var options = await _context.CustomisationOptions
            .Where(co => co.SupplierId == supplierId)
            .OrderBy(co => co.Type)
            .ThenBy(co => co.MinQuantity)
            .ToListAsync();

        return Ok(options.Select(co => MapToDto(co, supplier.Name)));
    }

    // GET /api/customisation/product/{productId}
    [HttpGet("product/{productId:int}")]
    public async Task<IActionResult> GetByProduct(int productId)
    {
        var product = await _context.Products
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == productId);

        if (product == null) return NotFound(new { message = $"Product {productId} not found." });

        var options = await _context.CustomisationOptions
            .Where(co => co.SupplierId == product.SupplierId
                      && co.MinQuantity >= product.Supplier.MinOrderQuantity)
            .OrderBy(co => co.Type)
            .ThenBy(co => co.MinQuantity)
            .ToListAsync();

        return Ok(options.Select(co => MapToDto(co, product.Supplier.Name)));
    }

    // POST /api/customisation
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CustomisationOptionCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId);
        if (supplier == null) return BadRequest(new { message = "Supplier not found." });

        if (!Enum.TryParse<CustomisationType>(dto.Type, true, out var type))
            return BadRequest(new { message = $"Invalid type '{dto.Type}'. Valid values: SilkScreen, HotStamping." });

        var option = new CustomisationOption
        {
            SupplierId = dto.SupplierId,
            Type = type,
            MinQuantity = dto.MinQuantity,
            TotalPriceZAR = dto.TotalPriceZAR,
            Notes = dto.Notes,
        };

        _context.CustomisationOptions.Add(option);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBySupplier),
            new { supplierId = option.SupplierId },
            MapToDto(option, supplier.Name));
    }

    // PUT /api/customisation/{id}
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] CustomisationOptionCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var option = await _context.CustomisationOptions
            .Include(co => co.Supplier)
            .FirstOrDefaultAsync(co => co.Id == id);

        if (option == null) return NotFound(new { message = $"Customisation option {id} not found." });

        if (!Enum.TryParse<CustomisationType>(dto.Type, true, out var type))
            return BadRequest(new { message = $"Invalid type '{dto.Type}'. Valid values: SilkScreen, HotStamping." });

        option.SupplierId = dto.SupplierId;
        option.Type = type;
        option.MinQuantity = dto.MinQuantity;
        option.TotalPriceZAR = dto.TotalPriceZAR;
        option.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        var supplier = await _context.Suppliers.FindAsync(option.SupplierId);
        return Ok(MapToDto(option, supplier?.Name ?? string.Empty));
    }

    // DELETE /api/customisation/{id}
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var option = await _context.CustomisationOptions.FindAsync(id);
        if (option == null) return NotFound(new { message = $"Customisation option {id} not found." });

        _context.CustomisationOptions.Remove(option);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static CustomisationOptionDto MapToDto(CustomisationOption co, string supplierName) => new()
    {
        Id = co.Id,
        SupplierId = co.SupplierId,
        SupplierName = supplierName,
        Type = co.Type.ToString(),
        MinQuantity = co.MinQuantity,
        TotalPriceZAR = co.TotalPriceZAR,
        Notes = co.Notes,
    };
}
