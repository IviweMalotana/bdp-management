namespace BDP.API.Models;

public class Client
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? TradingName { get; set; }
    public string? CompanyRegistrationNumber { get; set; }
    public string? VatNumber { get; set; }
    public string ContactPersonName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string? Industry { get; set; }
    public string? PaystackCustomerId { get; set; }
    public decimal CreditLimit { get; set; }
    public int PaymentTermsDays { get; set; } = 30;
    public bool IsActive { get; set; } = true;
    public List<Order> Orders { get; set; } = new();
    public List<RecurringOrder> RecurringOrders { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
