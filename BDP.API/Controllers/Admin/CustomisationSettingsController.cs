using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Admin;

[ApiController]
[Route("api/admin/customisation")]
[Authorize(Roles = "Admin,Manager")]
public class CustomisationSettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustomisationSettingsController(AppDbContext db) => _db = db;

    // GET /api/admin/customisation/settings
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _db.CustomisationSettings
            .OrderBy(s => s.Type)
            .Select(s => new
            {
                s.Id,
                s.Type,
                s.PricePerUnitZAR,
                s.IsActive,
                s.DefaultMinimumQuantity,
            })
            .ToListAsync();

        return Ok(settings);
    }

    // PUT /api/admin/customisation/settings/{id}
    [HttpPut("settings/{id:int}")]
    public async Task<IActionResult> UpdateSetting(int id, [FromBody] UpdateSettingRequest req)
    {
        var setting = await _db.CustomisationSettings.FindAsync(id);
        if (setting == null) return NotFound();

        setting.PricePerUnitZAR = req.PricePerUnitZAR;
        setting.IsActive = req.IsActive;
        setting.DefaultMinimumQuantity = req.DefaultMinimumQuantity;

        await _db.SaveChangesAsync();
        return Ok(new
        {
            setting.Id,
            setting.Type,
            setting.PricePerUnitZAR,
            setting.IsActive,
            setting.DefaultMinimumQuantity,
        });
    }

    // GET /api/admin/customisation/suppliers
    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers()
    {
        var allTypes = new[] { "SilkScreen", "HotStamping", "ColourChange" };

        var suppliers = await _db.Suppliers
            .Include(s => s.CustomisationOptions)
            .OrderBy(s => s.Name)
            .ToListAsync();

        var result = suppliers.Select(s => new
        {
            supplierId = s.Id,
            supplierName = s.Name,
            options = allTypes.Select(type =>
            {
                var opt = s.CustomisationOptions.FirstOrDefault(co => co.Type == type);
                return new
                {
                    type,
                    isEnabled = opt?.IsEnabled ?? false,
                    minimumQuantity = opt?.MinimumQuantity,
                };
            }).ToList(),
        }).ToList();

        return Ok(result);
    }

    // PUT /api/admin/customisation/suppliers/{supplierId}/options
    [HttpPut("suppliers/{supplierId:int}/options")]
    public async Task<IActionResult> UpdateSupplierOptions(int supplierId, [FromBody] UpdateSupplierOptionsRequest req)
    {
        var supplier = await _db.Suppliers
            .Include(s => s.CustomisationOptions)
            .FirstOrDefaultAsync(s => s.Id == supplierId);

        if (supplier == null) return NotFound();

        foreach (var item in req.Options)
        {
            var existing = supplier.CustomisationOptions.FirstOrDefault(co => co.Type == item.Type);
            if (existing == null)
            {
                _db.CustomisationOptions.Add(new CustomisationOption
                {
                    SupplierId = supplierId,
                    Type = item.Type,
                    IsEnabled = item.IsEnabled,
                    MinimumQuantity = item.MinimumQuantity,
                });
            }
            else
            {
                existing.IsEnabled = item.IsEnabled;
                existing.MinimumQuantity = item.MinimumQuantity;
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class UpdateSettingRequest
{
    public decimal PricePerUnitZAR { get; set; }
    public bool IsActive { get; set; }
    public int DefaultMinimumQuantity { get; set; }
}

public class UpdateSupplierOptionsRequest
{
    public List<SupplierOptionItem> Options { get; set; } = new();
}

public class SupplierOptionItem
{
    public string Type { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public int? MinimumQuantity { get; set; }
}
