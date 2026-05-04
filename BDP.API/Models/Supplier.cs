namespace BDP.API.Models;

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = "China";
    public string? Address { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public bool SuppliesBottles { get; set; }
    public bool SuppliesCustomisation { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Product> Products { get; set; } = new();
    public List<CustomisationOption> CustomisationOptions { get; set; } = new();
    public List<Shipment> Shipments { get; set; } = new();
}
