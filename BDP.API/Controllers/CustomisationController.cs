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

        // Customer-facing sale price per finish is fixed in CustomisationSettings.
        // Profit = that defined sale − the actual supplier cost (by qty/supplier).
        var settings = await _context.CustomisationSettings.ToListAsync();
        decimal SaleFor(string type) =>
            settings.FirstOrDefault(s => s.Type == type)?.PricePerUnitZAR ?? 0m;

        var result = options
            .Select(co => MapToDto(co, co.Supplier?.Name ?? string.Empty, SaleFor(co.Type)))
            .ToList();

        // Colour change: free to produce, but charged to the customer. No supplier
        // cost tiers — surface it as a single all-profit line.
        var colourSale = SaleFor("ColourChange");
        if (colourSale > 0)
        {
            result.Add(new CustomisationOptionDto
            {
                Id = 0,
                SupplierId = 0,
                SupplierName = "Any supplier",
                Type = "ColourChange",
                MinimumQuantity = settings.FirstOrDefault(s => s.Type == "ColourChange")?.DefaultMinimumQuantity,
                PricingTiers = new()
                {
                    new CustomisationPricingTierDto
                    {
                        Quantity = 1,
                        CostPerUnitZAR = 0m,
                        SalePerUnitZAR = colourSale,
                        SalePriceZAR = colourSale,
                        ProfitPerUnitZAR = colourSale,
                        TotalCostZAR = 0m,
                        TotalSaleZAR = colourSale,
                        TotalProfitZAR = colourSale,
                        MarginPercent = 100m,
                        SalePriceDerived = false,
                    }
                }
            });
        }

        return Ok(result);
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

    // Fallback only: if no defined sale price exists, derive at 70% markup.
    private const decimal CustomisationMarkupRate = 0.70m;

    // definedSalePerUnit: the fixed customer-facing sale price for this finish
    // (from CustomisationSettings). 0 → fall back to the tier's own price or a
    // derived markup.
    private static CustomisationPricingTierDto BuildTierDto(CustomisationPricingTier t, decimal definedSalePerUnit)
    {
        var cost = t.CostPerUnitZAR;   // true supplier cost per unit
        bool derived;
        decimal salePerUnit;
        if (definedSalePerUnit > 0m)
        {
            salePerUnit = Math.Round(definedSalePerUnit, 2);
            derived = false;
        }
        else if (t.SalePriceZAR > 0m)
        {
            salePerUnit = Math.Round(t.SalePriceZAR, 2);
            derived = false;
        }
        else
        {
            salePerUnit = Math.Round(cost * (1 + CustomisationMarkupRate), 2);
            derived = true;
        }

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

    private static CustomisationOptionDto MapToDto(CustomisationOption co, string supplierName, decimal definedSalePerUnit = 0m) => new()
    {
        Id = co.Id,
        SupplierId = co.SupplierId,
        SupplierName = supplierName,
        Type = co.Type,
        Link1688 = co.Link1688,
        MinimumQuantity = co.MinimumQuantity,
        PricingTiers = co.PricingTiers?.OrderBy(t => t.Quantity).Select(t => BuildTierDto(t, definedSalePerUnit)).ToList() ?? new(),
    };
}
