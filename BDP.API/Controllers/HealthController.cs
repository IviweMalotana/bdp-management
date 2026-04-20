using BDP.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;
    public HealthController(AppDbContext context) => _context = context;

    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });

    [HttpGet("db-counts")]
    public async Task<IActionResult> DbCounts() => Ok(new
    {
        suppliers = await _context.Suppliers.CountAsync(),
        products = await _context.Products.CountAsync(),
        pricingTiers = await _context.PricingTiers.CountAsync(),
        productPricingTiers = await _context.ProductPricingTiers.CountAsync(),
        customisationOptions = await _context.CustomisationOptions.CountAsync(),
    });
}
