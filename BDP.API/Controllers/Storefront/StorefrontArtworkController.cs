using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/artwork")]
public class StorefrontArtworkController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".ai", ".eps", ".png", ".jpg", ".jpeg", ".svg"
    };

    private const long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

    public StorefrontArtworkController(AppDbContext db, GoogleDriveService drive)
    {
        _db = db;
        _drive = drive;
    }

    private async Task<CartItem?> ResolveCartItem(int cartItemId)
    {
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        var item = await _db.CartItems
            .Include(ci => ci.Cart)
            .Include(ci => ci.Artworks)
            .FirstOrDefaultAsync(ci => ci.Id == cartItemId);

        if (item == null) return null;

        if (!string.IsNullOrEmpty(userId) && item.Cart.UserId == userId) return item;
        if (!string.IsNullOrEmpty(sessionToken) && item.Cart.SessionToken == sessionToken) return item;

        return null;
    }

    [HttpPost("cart-items/{cartItemId:int}")]
    public async Task<IActionResult> Upload(int cartItemId, IFormFile? file, [FromForm] string? notes)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File exceeds the 20 MB size limit." });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type not allowed. Accepted: {string.Join(", ", AllowedExtensions)}" });

        var cartItem = await ResolveCartItem(cartItemId);
        if (cartItem == null)
            return NotFound(new { message = "Cart item not found or access denied." });

        // Remove existing artwork records (Drive files are retained for safety)
        if (cartItem.Artworks.Any())
        {
            _db.CartItemArtworks.RemoveRange(cartItem.Artworks);
        }

        byte[] bytes;
        using (var ms = new MemoryStream())
        {
            await file.CopyToAsync(ms);
            bytes = ms.ToArray();
        }

        var uniqueName = $"{Guid.NewGuid()}{ext}";
        var mimeType = file.ContentType.Contains('/') ? file.ContentType : "application/octet-stream";

        var driveUrl = await _drive.UploadFileAsync(bytes, uniqueName, mimeType);
        if (driveUrl == null)
            return StatusCode(502, new { message = "Failed to upload artwork to cloud storage. Please try again." });

        var artwork = new CartItemArtwork
        {
            CartItemId = cartItemId,
            FileName = file.FileName,
            FileUrl = driveUrl,
            Notes = notes,
        };

        _db.CartItemArtworks.Add(artwork);
        await _db.SaveChangesAsync();

        return Ok(new { id = artwork.Id, fileName = artwork.FileName, fileUrl = artwork.FileUrl, notes = artwork.Notes });
    }

    [HttpDelete("cart-items/{cartItemId:int}")]
    public async Task<IActionResult> Remove(int cartItemId)
    {
        var cartItem = await ResolveCartItem(cartItemId);
        if (cartItem == null)
            return NotFound(new { message = "Cart item not found or access denied." });

        _db.CartItemArtworks.RemoveRange(cartItem.Artworks);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
