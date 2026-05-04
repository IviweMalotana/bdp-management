namespace BDP.API.DTOs.Clients;

public class ClientDto
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
    public int PaymentTermsDays { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ClientSummaryDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string ContactPersonName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalSpendZAR { get; set; }
}

public class ClientDetailDto : ClientDto
{
    public List<ClientOrderSummaryDto> RecentOrders { get; set; } = new();
}

public class ClientOrderSummaryDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalZAR { get; set; }
    public bool IsPaid { get; set; }
    public DateTime OrderDate { get; set; }
}

public class CreateClientDto
{
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
    public decimal CreditLimit { get; set; }
    public int PaymentTermsDays { get; set; } = 30;
}

public class UpdateClientDto
{
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
    public decimal CreditLimit { get; set; }
    public int PaymentTermsDays { get; set; }
    public bool IsActive { get; set; }
}
