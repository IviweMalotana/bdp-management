using BDP.API.Data;
using BDP.API.DTOs.Collections;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/collections")]
[Authorize]
public class CollectionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CollectionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var collections = await _context.Collections
            .Select(c => new CollectionDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                MetaTitle = c.MetaTitle,
                MetaDescription = c.MetaDescription,
                MetaKeywords = c.MetaKeywords,
                Slug = c.Slug,
                ImageUrl = c.ImageUrl,
                ProductCount = c.ProductCollections.Count,
                CreatedAt = c.CreatedAt
            })
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(collections);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var col = await _context.Collections
            .Include(c => c.ProductCollections)
                .ThenInclude(pc => pc.Product)
                    .ThenInclude(p => p.Variants)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (col == null) return NotFound();

        var dto = new CollectionDetailDto
        {
            Id = col.Id,
            Name = col.Name,
            Description = col.Description,
            MetaTitle = col.MetaTitle,
            MetaDescription = col.MetaDescription,
            MetaKeywords = col.MetaKeywords,
            Slug = col.Slug,
            ImageUrl = col.ImageUrl,
            ProductCount = col.ProductCollections.Count,
            CreatedAt = col.CreatedAt,
            Products = col.ProductCollections.Select(pc => new CollectionProductDto
            {
                ProductId = pc.ProductId,
                Name = pc.Product.Name,
                Category = pc.Product.Category,
                Slug = pc.Product.Slug,
                VariantCount = pc.Product.Variants.Count
            }).ToList()
        };
        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCollectionDto dto)
    {
        if (await _context.Collections.AnyAsync(c => c.Slug == dto.Slug))
            return BadRequest("Slug already exists.");

        var col = new Collection
        {
            Name = dto.Name,
            Description = dto.Description,
            MetaTitle = dto.MetaTitle,
            MetaDescription = dto.MetaDescription,
            MetaKeywords = dto.MetaKeywords,
            Slug = dto.Slug,
            ImageUrl = dto.ImageUrl
        };
        _context.Collections.Add(col);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = col.Id }, new CollectionDto
        {
            Id = col.Id, Name = col.Name, Description = col.Description,
            MetaTitle = col.MetaTitle, MetaDescription = col.MetaDescription,
            MetaKeywords = col.MetaKeywords, Slug = col.Slug, ImageUrl = col.ImageUrl,
            ProductCount = 0, CreatedAt = col.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCollectionDto dto)
    {
        var col = await _context.Collections.FindAsync(id);
        if (col == null) return NotFound();

        if (await _context.Collections.AnyAsync(c => c.Slug == dto.Slug && c.Id != id))
            return BadRequest("Slug already exists.");

        col.Name = dto.Name;
        col.Description = dto.Description;
        col.MetaTitle = dto.MetaTitle;
        col.MetaDescription = dto.MetaDescription;
        col.MetaKeywords = dto.MetaKeywords;
        col.Slug = dto.Slug;
        col.ImageUrl = dto.ImageUrl;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var col = await _context.Collections.FindAsync(id);
        if (col == null) return NotFound();
        _context.Collections.Remove(col);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/products")]
    public async Task<IActionResult> AddProduct(int id, [FromBody] AddProductToCollectionDto dto)
    {
        if (!await _context.Collections.AnyAsync(c => c.Id == id)) return NotFound();
        if (!await _context.Products.AnyAsync(p => p.Id == dto.ProductId))
            return BadRequest("Product not found.");
        if (await _context.ProductCollections.AnyAsync(pc => pc.CollectionId == id && pc.ProductId == dto.ProductId))
            return Conflict("Product already in collection.");

        _context.ProductCollections.Add(new ProductCollection { CollectionId = id, ProductId = dto.ProductId });
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}/products/{productId}")]
    public async Task<IActionResult> RemoveProduct(int id, int productId)
    {
        var pc = await _context.ProductCollections
            .FirstOrDefaultAsync(x => x.CollectionId == id && x.ProductId == productId);
        if (pc == null) return NotFound();
        _context.ProductCollections.Remove(pc);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
