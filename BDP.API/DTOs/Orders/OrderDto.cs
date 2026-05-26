namespace BDP.API.DTOs.Orders;

public class OrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingCarrier { get; set; }
    public string? YunOrderId { get; set; }
    public string FulfilmentStatus { get; set; } = "Pending";
    public string? ShippingServiceCode { get; set; }
    public string? ShippingServiceName { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}
