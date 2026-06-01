namespace BDP.API.Models;

public static class OrderStatus
{
    public const string Placed                 = "Placed";
    public const string Processing             = "Processing";
    public const string CustomisationAccepted  = "Customisation Accepted";
    public const string ReadyToShip            = "Ready to Ship";
    public const string Shipped                = "Shipped";
    public const string Delivered              = "Delivered";
    public const string Cancelled              = "Cancelled";

    // Legacy values kept for existing data backward compatibility
    public const string Draft       = "Draft";
    public const string Pending     = "Pending";
    public const string Confirmed   = "Confirmed";
    public const string InProduction = "InProduction";
}

public static class RecurringOrderStatus
{
    public const string Active    = "Active";
    public const string Paused    = "Paused";
    public const string Cancelled = "Cancelled";
}
