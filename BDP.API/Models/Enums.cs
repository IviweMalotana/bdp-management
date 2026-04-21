namespace BDP.API.Models;

public enum CustomisationType { SilkScreen, HotStamping }

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
