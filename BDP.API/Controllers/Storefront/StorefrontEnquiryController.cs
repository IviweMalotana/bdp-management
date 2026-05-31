using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront")]
public class StorefrontEnquiryController : ControllerBase
{
    private readonly ILogger<StorefrontEnquiryController> _logger;

    public StorefrontEnquiryController(ILogger<StorefrontEnquiryController> logger)
        => _logger = logger;

    public record EnquiryRequest(string Name, string Email, string? Company, string Message);

    [HttpPost("enquiries")]
    public IActionResult SubmitEnquiry([FromBody] EnquiryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Message is required." });

        _logger.LogInformation(
            "New storefront enquiry — Name: {Name}, Email: {Email}, Company: {Company}, Message: {Message}",
            request.Name,
            request.Email,
            request.Company ?? "(none)",
            request.Message
        );

        return Ok(new { message = "Thank you, we’ll be in touch shortly." });
    }
}
