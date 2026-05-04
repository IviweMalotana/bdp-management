namespace BDP.API.Models;

public static class OrderStatus
{
    public const string Draft       = "Draft";
    public const string Pending     = "Pending";
    public const string Confirmed   = "Confirmed";
    public const string InProduction = "InProduction";
    public const string Shipped     = "Shipped";
    public const string Delivered   = "Delivered";
    public const string Cancelled   = "Cancelled";
}

public static class RecurringOrderStatus
{
    public const string Active    = "Active";
    public const string Paused    = "Paused";
    public const string Cancelled = "Cancelled";
}
