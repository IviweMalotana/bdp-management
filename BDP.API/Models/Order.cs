namespace BDP.API.Models;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? RequiredByDate { get; set; }
    public DateTime? ShippedDate { get; set; }
    public DateTime? DeliveredDate { get; set; }
    public decimal SubtotalZAR { get; set; }
    public decimal ShippingCostZAR { get; set; }
    public decimal TotalZAR { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaystackPaymentReference { get; set; }
    public int? RecurringOrderId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Client Client { get; set; } = null!;
    public RecurringOrder? RecurringOrder { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
}
