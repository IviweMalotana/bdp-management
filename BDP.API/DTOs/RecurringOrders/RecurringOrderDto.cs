namespace BDP.API.DTOs.RecurringOrders;

public class RecurringOrderDto
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int FrequencyDays { get; set; }
    public DateTime ContractStartDate { get; set; }
    public DateTime ContractEndDate { get; set; }
    public DateTime NextOrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<RecurringOrderItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class RecurringOrderItemDto
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
    public string VariantName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int? CustomisationOptionId { get; set; }
    public string? CustomisationType { get; set; }
    public int Quantity { get; set; }
}

public class CreateRecurringOrderDto
{
    public int ClientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int FrequencyDays { get; set; }
    public DateTime ContractStartDate { get; set; }
    public DateTime ContractEndDate { get; set; }
    public DateTime NextOrderDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateRecurringOrderItemDto> Items { get; set; } = new();
}

public class CreateRecurringOrderItemDto
{
    public int ProductVariantId { get; set; }
    public int? CustomisationOptionId { get; set; }
    public int Quantity { get; set; }
}

public class UpdateRecurringOrderDto
{
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int FrequencyDays { get; set; }
    public DateTime ContractStartDate { get; set; }
    public DateTime ContractEndDate { get; set; }
    public DateTime NextOrderDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateRecurringOrderItemDto> Items { get; set; } = new();
}
