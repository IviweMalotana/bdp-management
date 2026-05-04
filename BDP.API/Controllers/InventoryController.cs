using BDP.API.DTOs.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok(Array.Empty<InventoryItemDto>());

    [HttpGet("summary")]
    public IActionResult GetSummary() => Ok(Array.Empty<InventorySummaryDto>());

    [HttpGet("low-stock")]
    public IActionResult GetLowStock() => Ok(Array.Empty<InventoryItemDto>());

    [HttpGet("{productId:int}")]
    public IActionResult GetByProduct(int productId) => Ok(Array.Empty<InventoryItemDto>());

    [HttpPut("{id:int}")]
    public IActionResult Update(int id, [FromBody] UpdateInventoryDto dto) =>
        NotFound(new { message = "Inventory management has been removed." });

    [HttpPost("bulk-update")]
    public IActionResult BulkUpdate([FromBody] BulkUpdateInventoryDto dto) =>
        NotFound(new { message = "Inventory management has been removed." });
}
