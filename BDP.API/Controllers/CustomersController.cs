using BDP.API.Data;
using BDP.API.DTOs.Common;
using BDP.API.DTOs.Customers;
using BDP.API.DTOs.Orders;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomersController(AppDbContext context) => _context = context;

    // GET /api/customers?page=1&pageSize=20&search=X
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var query = _context.Customers
            .Include(c => c.Orders)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(c =>
                c.CompanyName.ToLower().Contains(lower) ||
                c.ContactName.ToLower().Contains(lower) ||
                c.Email.ToLower().Contains(lower));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(c => c.CompanyName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResultDto<CustomerDto>
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/customers/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var customer = await _context.Customers
            .Include(c => c.Orders)
                .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null) return NotFound(new { message = $"Customer {id} not found." });

        return Ok(new CustomerDetailDto
        {
            Id = customer.Id,
            CompanyName = customer.CompanyName,
            ContactName = customer.ContactName,
            Email = customer.Email,
            Phone = customer.Phone,
            BrandName = customer.BrandName,
            Country = customer.Country,
            Notes = customer.Notes,
            CreatedAt = customer.CreatedAt,
            TotalOrders = customer.Orders.Count,
            Orders = customer.Orders
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    OrderNumber = o.OrderNumber,
                    CustomerId = o.CustomerId,
                    CustomerName = customer.CompanyName,
                    Status = o.Status,
                    OrderDate = o.OrderDate,
                    EstimatedDeliveryDate = o.EstimatedDeliveryDate,
                    TotalAmountZAR = o.TotalAmountZAR,
                    BrandingType = o.BrandingType,
                    Notes = o.Notes,
                    CreatedAt = o.CreatedAt,
                    UpdatedAt = o.UpdatedAt,
                    OrderItems = o.OrderItems.Select(oi => new OrderItemDto
                    {
                        Id = oi.Id,
                        OrderId = oi.OrderId,
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.Name ?? string.Empty,
                        SKU = oi.SKU,
                        Quantity = oi.Quantity,
                        UnitPriceZAR = oi.UnitPriceZAR,
                        TotalPriceZAR = oi.TotalPriceZAR,
                        BrandingCostZAR = oi.BrandingCostZAR
                    }).ToList()
                }).ToList()
        });
    }

    // POST /api/customers
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var customer = new Customer
        {
            CompanyName = dto.CompanyName,
            ContactName = dto.ContactName,
            Email = dto.Email,
            Phone = dto.Phone,
            BrandName = dto.BrandName,
            Country = dto.Country,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, MapToDto(customer));
    }

    // PUT /api/customers/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound(new { message = $"Customer {id} not found." });

        customer.CompanyName = dto.CompanyName;
        customer.ContactName = dto.ContactName;
        customer.Email = dto.Email;
        customer.Phone = dto.Phone;
        customer.BrandName = dto.BrandName;
        customer.Country = dto.Country;
        customer.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(customer));
    }

    private static CustomerDto MapToDto(Customer c) => new()
    {
        Id = c.Id,
        CompanyName = c.CompanyName,
        ContactName = c.ContactName,
        Email = c.Email,
        Phone = c.Phone,
        BrandName = c.BrandName,
        Country = c.Country,
        Notes = c.Notes,
        CreatedAt = c.CreatedAt,
        TotalOrders = c.Orders?.Count ?? 0
    };
}
