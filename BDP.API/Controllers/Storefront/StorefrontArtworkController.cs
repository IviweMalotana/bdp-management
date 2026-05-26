using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/artwork")]
public class StorefrontArtworkController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".ai", ".eps", ".png", ".jpg", ".jpeg", ".svg"
    };

    private const long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

    public StorefrontArtworkController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private async Task<CartItem?> ResolveCartItem(int cartItemId)
    {
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        // Load cart item with its cart
        var item = await _db.CartItems
            .Include(ci => ci.Cart)
            .Include(ci => ci.Artworks)
            .FirstOrDefaultAsync(ci => ci.Id == cartItemId);

        if (item == null) return null;

        // Verify the cart belongs to the caller
        if (!string.IsNullOrEmpty(userId) && item.Cart.UserId == userId) return item;
        if (!string.IsNullOrEmpty(sessionToken) && item.Cart.SessionToken == sessionToken) return item;

        return null; // Access denied
    }

    private string UploadsDir()
    {
        var wwwroot = _env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var dir = Path.Combine(wwwroot, "uploads", "artwork");
        Directory.CreateDirectory(dir);
        return dir;
    }

    /// <summary>
    /// Upload artwork for a cart item.
    /// Note: Railway filesystem is ephemeral — files are lost on redeploy.
    /// Future: migrate to cloud storage (S3/R2).
    /// </summary>
    [HttpPost("cart-items/{cartItemId:int}")]
    public async Task<IActionResult> Upload(int cartItemId, IFormFile? file, [FromForm] string? notes)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File exceeds the 20 MB size limit." });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type not allowed. Accepted types: {string.Join(", ", AllowedExtensions)}" });

        var cartItem = await ResolveCartItem(cartItemId);
        if (cartItem == null)
            return NotFound(new { message = "Cart item not found or access denied." });

        // Remove any existing artwork before saving new one
        if (cartItem.Artworks.Any())
        {
            foreach (var existing in cartItem.Artworks)
            {
                var existingPath = Path.Combine(UploadsDir(), Path.GetFileName(existing.FileUrl));
                if (System.IO.File.Exists(existingPath))
                    System.IO.File.Delete(existingPath);
                _db.CartItemArtworks.Remove(existing);
            }
        }

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(UploadsDir(), fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/artwork/{fileName}";

        var artwork = new CartItemArtwork
        {
            CartItemId = cartItemId,
            FileName = file.FileName,
            FileUrl = fileUrl,
            Notes = notes
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

        foreach (var artwork in cartItem.Artworks)
        {
            var existingPath = Path.Combine(UploadsDir(), Path.GetFileName(artwork.FileUrl));
            if (System.IO.File.Exists(existingPath))
                System.IO.File.Delete(existingPath);
            _db.CartItemArtworks.Remove(artwork);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
