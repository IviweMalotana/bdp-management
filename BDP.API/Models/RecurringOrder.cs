namespace BDP.API.Models;

public class RecurringOrder
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int FrequencyDays { get; set; }
    public DateTime ContractStartDate { get; set; }
    public DateTime ContractEndDate { get; set; }
    public DateTime NextOrderDate { get; set; }
    public string Status { get; set; } = "Active";
    public string? Notes { get; set; }
    public List<RecurringOrderItem> Items { get; set; } = new();
    public List<Order> GeneratedOrders { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class RecurringOrderItem
{
    public int Id { get; set; }
    public int RecurringOrderId { get; set; }
    public RecurringOrder RecurringOrder { get; set; } = null!;
    public int ProductVariantId { get; set; }
    public ProductVariant ProductVariant { get; set; } = null!;
    public int? CustomisationOptionId { get; set; }
    public CustomisationOption? CustomisationOption { get; set; }
    public int Quantity { get; set; }
}
