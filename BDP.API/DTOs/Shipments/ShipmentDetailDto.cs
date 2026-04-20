namespace BDP.API.DTOs.Shipments;

public class ShipmentDetailDto : ShipmentDto
{
    public List<ShipmentItemDto> Items { get; set; } = new();
}
