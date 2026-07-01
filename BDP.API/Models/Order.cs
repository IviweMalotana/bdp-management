namespace BDP.API.Models;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int? ClientId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? RequiredByDate { get; set; }
    public DateTime? ShippedDate { get; set; }
    public DateTime? DeliveredDate { get; set; }
    public decimal SubtotalZAR { get; set; }
    public decimal ShippingCostZAR { get; set; }
    // What the shipment actually costs us, priced at the real product weight (not the
    // billing weight the customer is charged). ShippingCostZAR − ActualShippingCostZAR
    // is the shipping margin. 0 when real weight is unknown.
    public decimal ActualShippingCostZAR { get; set; }
    public decimal TotalZAR { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaystackPaymentReference { get; set; }
    // Set once the order-confirmation email has gone out, so webhook + success-page
    // verify can both trigger it without sending duplicates.
    public DateTime? ConfirmationEmailSentAt { get; set; }
    public int? RecurringOrderId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? UserId { get; set; }
    public string? GuestEmail { get; set; }
    public string Channel { get; set; } = "B2B_Admin";
    public string? ShippingAddressJson { get; set; }
    public string? BillingAddressJson { get; set; }
    public string? PaymentMethod { get; set; }
    public string FulfilmentStatus { get; set; } = "Pending";
    public string? ShippingServiceCode { get; set; }
    public string? ShippingServiceName { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingCarrier { get; set; }
    public string? YunOrderId { get; set; }  // YunExpress internal order ID (needed for cancel/info)

    public Client? Client { get; set; }
    public RecurringOrder? RecurringOrder { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
}
