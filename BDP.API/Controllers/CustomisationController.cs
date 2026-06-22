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
            .Include(co => co.PricingTiers)
            .Where(co => co.SupplierId == supplierId)
            .OrderBy(co => co.Type)
            .ThenBy(co => co.MinimumQuantity)
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
            .Include(co => co.PricingTiers)
            .Where(co => co.SupplierId == product.SupplierId)
            .OrderBy(co => co.Type)
            .ThenBy(co => co.MinimumQuantity)
            .ToListAsync();

        return Ok(options.Select(co => MapToDto(co, product.Supplier.Name)));
    }

    // GET /api/customisation/all — every supplier's customisation options with
    // true costs and computed profit, for the admin profitability dashboard.
    [HttpGet("all")]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        var options = await _context.CustomisationOptions
            .Include(co => co.PricingTiers)
            .Include(co => co.Supplier)
            .OrderBy(co => co.Supplier.Name)
            .ThenBy(co => co.Type)
            .ThenBy(co => co.MinimumQuantity)
            .ToListAsync();

        return Ok(options.Select(co => MapToDto(co, co.Supplier?.Name ?? string.Empty)));
    }

    // POST /api/customisation
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CustomisationOptionCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId);
        if (supplier == null) return BadRequest(new { message = "Supplier not found." });

        var option = new CustomisationOption
        {
            SupplierId = dto.SupplierId,
            Type = dto.Type,
            Link1688 = dto.Link1688,
            MinimumQuantity = dto.MinimumQuantity,
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
            .Include(co => co.PricingTiers)
            .FirstOrDefaultAsync(co => co.Id == id);

        if (option == null) return NotFound(new { message = $"Customisation option {id} not found." });

        option.SupplierId = dto.SupplierId;
        option.Type = dto.Type;
        option.Link1688 = dto.Link1688;
        option.MinimumQuantity = dto.MinimumQuantity;

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

    // Customisation is priced as a 70% markup on the true supplier cost when no
    // explicit sale price is stored — matching the product pricing model.
    private const decimal CustomisationMarkupRate = 0.70m;

    private static CustomisationPricingTierDto BuildTierDto(CustomisationPricingTier t)
    {
        var cost = t.CostPerUnitZAR;   // true supplier cost per unit
        var derived = t.SalePriceZAR <= 0m;
        var salePerUnit = derived
            ? Math.Round(cost * (1 + CustomisationMarkupRate), 2)
            : Math.Round(t.SalePriceZAR, 2);

        var profitPerUnit = Math.Round(salePerUnit - cost, 4);
        var totalCost = Math.Round(cost * t.Quantity, 2);
        var totalSale = Math.Round(salePerUnit * t.Quantity, 2);
        var totalProfit = Math.Round(totalSale - totalCost, 2);
        var margin = totalSale > 0 ? Math.Round(totalProfit / totalSale * 100m, 2) : 0m;

        return new CustomisationPricingTierDto
        {
            Id = t.Id,
            Quantity = t.Quantity,
            CostCNY = t.CostCNY,
            CostWithShippingCNY = t.CostWithShippingCNY,
            CostPerUnitZAR = cost,
            SalePriceZAR = t.SalePriceZAR,
            SKU = t.SKU,
            SalePerUnitZAR = salePerUnit,
            ProfitPerUnitZAR = profitPerUnit,
            TotalCostZAR = totalCost,
            TotalSaleZAR = totalSale,
            TotalProfitZAR = totalProfit,
            MarginPercent = margin,
            SalePriceDerived = derived,
        };
    }

    private static CustomisationOptionDto MapToDto(CustomisationOption co, string supplierName) => new()
    {
        Id = co.Id,
        SupplierId = co.SupplierId,
        SupplierName = supplierName,
        Type = co.Type,
        Link1688 = co.Link1688,
        MinimumQuantity = co.MinimumQuantity,
        PricingTiers = co.PricingTiers?.OrderBy(t => t.Quantity).Select(BuildTierDto).ToList() ?? new(),
    };
}
