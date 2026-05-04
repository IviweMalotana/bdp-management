namespace BDP.API.Models;

public enum ShipmentStatus
{
    Ordered,
    ManufacturingInProgress,
    ReadyToShip,
    InTransit,
    InCustoms,
    OutForDelivery,
    Delivered,
    Cancelled
}
