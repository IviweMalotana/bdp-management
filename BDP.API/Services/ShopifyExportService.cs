using BDP.API.Data;

namespace BDP.API.Services;

public class ShopifyExportService
{
    private readonly AppDbContext _context;

    public ShopifyExportService(AppDbContext context) => _context = context;

    public Task<byte[]> ExportToCsv(List<int> productIds)
    {
        return Task.FromResult(Array.Empty<byte>());
    }
}
