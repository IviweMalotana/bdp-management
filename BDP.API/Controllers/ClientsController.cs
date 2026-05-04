using BDP.API.Data;
using BDP.API.DTOs.Clients;
using BDP.API.DTOs.Invoices;
using BDP.API.DTOs.Orders;
using BDP.API.DTOs.RecurringOrders;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PaystackService _paystack;

    public ClientsController(AppDbContext context, PaystackService paystack)
    {
        _context = context;
        _paystack = paystack;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.Clients.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                c.CompanyName.Contains(search) ||
                c.ContactEmail.Contains(search) ||
                c.ContactPersonName.Contains(search));

        var total = await query.CountAsync();
        var clients = await query
            .OrderBy(c => c.CompanyName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ClientSummaryDto
            {
                Id = c.Id,
                CompanyName = c.CompanyName,
                ContactPersonName = c.ContactPersonName,
                ContactEmail = c.ContactEmail,
                IsActive = c.IsActive,
                TotalOrders = c.Orders.Count,
                TotalSpendZAR = c.Orders.Sum(o => o.TotalZAR)
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, data = clients });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var client = await _context.Clients
            .Include(c => c.Orders.OrderByDescending(o => o.OrderDate).Take(5))
            .FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound();

        var dto = new ClientDetailDto
        {
            Id = client.Id,
            CompanyName = client.CompanyName,
            TradingName = client.TradingName,
            CompanyRegistrationNumber = client.CompanyRegistrationNumber,
            VatNumber = client.VatNumber,
            ContactPersonName = client.ContactPersonName,
            ContactEmail = client.ContactEmail,
            ContactPhone = client.ContactPhone,
            BillingAddress = client.BillingAddress,
            ShippingAddress = client.ShippingAddress,
            Industry = client.Industry,
            PaystackCustomerId = client.PaystackCustomerId,
            CreditLimit = client.CreditLimit,
            PaymentTermsDays = client.PaymentTermsDays,
            IsActive = client.IsActive,
            CreatedAt = client.CreatedAt,
            RecentOrders = client.Orders.Select(o => new ClientOrderSummaryDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                TotalZAR = o.TotalZAR,
                IsPaid = o.IsPaid,
                OrderDate = o.OrderDate
            }).ToList()
        };
        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
    {
        var client = new Client
        {
            CompanyName = dto.CompanyName,
            TradingName = dto.TradingName,
            CompanyRegistrationNumber = dto.CompanyRegistrationNumber,
            VatNumber = dto.VatNumber,
            ContactPersonName = dto.ContactPersonName,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            BillingAddress = dto.BillingAddress,
            ShippingAddress = dto.ShippingAddress,
            Industry = dto.Industry,
            CreditLimit = dto.CreditLimit,
            PaymentTermsDays = dto.PaymentTermsDays
        };

        // Create Paystack customer
        try
        {
            var nameParts = dto.ContactPersonName.Split(' ', 2);
            var ps = await _paystack.CreateCustomerAsync(
                dto.ContactEmail,
                nameParts[0],
                nameParts.Length > 1 ? nameParts[1] : string.Empty,
                dto.ContactPhone);
            if (ps != null)
                client.PaystackCustomerId = ps.CustomerCode;
        }
        catch (Exception) { /* Paystack not configured — continue */ }

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = client.Id }, MapToDto(client));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClientDto dto)
    {
        var client = await _context.Clients.FindAsync(id);
        if (client == null) return NotFound();

        client.CompanyName = dto.CompanyName;
        client.TradingName = dto.TradingName;
        client.CompanyRegistrationNumber = dto.CompanyRegistrationNumber;
        client.VatNumber = dto.VatNumber;
        client.ContactPersonName = dto.ContactPersonName;
        client.ContactEmail = dto.ContactEmail;
        client.ContactPhone = dto.ContactPhone;
        client.BillingAddress = dto.BillingAddress;
        client.ShippingAddress = dto.ShippingAddress;
        client.Industry = dto.Industry;
        client.CreditLimit = dto.CreditLimit;
        client.PaymentTermsDays = dto.PaymentTermsDays;
        client.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(client));
    }

    [HttpGet("{id}/orders")]
    public async Task<IActionResult> GetOrders(int id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!await _context.Clients.AnyAsync(c => c.Id == id)) return NotFound();

        var orders = await _context.Orders
            .Where(o => o.ClientId == id)
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new ClientOrderSummaryDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                TotalZAR = o.TotalZAR,
                IsPaid = o.IsPaid,
                OrderDate = o.OrderDate
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}/invoices")]
    public async Task<IActionResult> GetInvoices(int id)
    {
        if (!await _context.Clients.AnyAsync(c => c.Id == id)) return NotFound();

        var invoices = await _context.Invoices
            .Include(i => i.Order)
            .Where(i => i.ClientId == id)
            .OrderByDescending(i => i.InvoiceDate)
            .Select(i => new InvoiceDto
            {
                Id = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                OrderId = i.OrderId,
                OrderNumber = i.Order.OrderNumber,
                ClientId = i.ClientId,
                ClientName = i.Client.CompanyName,
                InvoiceDate = i.InvoiceDate,
                DueDate = i.DueDate,
                SubtotalZAR = i.SubtotalZAR,
                VatZAR = i.VatZAR,
                TotalZAR = i.TotalZAR,
                Status = i.Status,
                PdfUrl = i.PdfUrl,
                SentAt = i.SentAt,
                PaidAt = i.PaidAt,
                PaystackPaymentRequestId = i.PaystackPaymentRequestId,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync();

        return Ok(invoices);
    }

    [HttpGet("{id}/recurring")]
    public async Task<IActionResult> GetRecurring(int id)
    {
        if (!await _context.Clients.AnyAsync(c => c.Id == id)) return NotFound();

        var orders = await _context.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(r => r.Items).ThenInclude(i => i.CustomisationOption)
            .Where(r => r.ClientId == id)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(MapRecurring));
    }

    private static ClientDto MapToDto(Client c) => new()
    {
        Id = c.Id,
        CompanyName = c.CompanyName,
        TradingName = c.TradingName,
        CompanyRegistrationNumber = c.CompanyRegistrationNumber,
        VatNumber = c.VatNumber,
        ContactPersonName = c.ContactPersonName,
        ContactEmail = c.ContactEmail,
        ContactPhone = c.ContactPhone,
        BillingAddress = c.BillingAddress,
        ShippingAddress = c.ShippingAddress,
        Industry = c.Industry,
        PaystackCustomerId = c.PaystackCustomerId,
        CreditLimit = c.CreditLimit,
        PaymentTermsDays = c.PaymentTermsDays,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt
    };

    private static RecurringOrderDto MapRecurring(RecurringOrder r) => new()
    {
        Id = r.Id,
        ClientId = r.ClientId,
        ClientName = r.Client?.CompanyName ?? string.Empty,
        Name = r.Name,
        Frequency = r.Frequency,
        FrequencyDays = r.FrequencyDays,
        ContractStartDate = r.ContractStartDate,
        ContractEndDate = r.ContractEndDate,
        NextOrderDate = r.NextOrderDate,
        Status = r.Status,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt,
        Items = r.Items.Select(i => new RecurringOrderItemDto
        {
            Id = i.Id,
            ProductVariantId = i.ProductVariantId,
            VariantName = i.ProductVariant != null ? $"{i.ProductVariant.Size} {i.ProductVariant.BottleColour}".Trim() : string.Empty,
            ProductName = i.ProductVariant?.Product?.Name ?? string.Empty,
            CustomisationOptionId = i.CustomisationOptionId,
            CustomisationType = i.CustomisationOption?.Type,
            Quantity = i.Quantity
        }).ToList()
    };
}
