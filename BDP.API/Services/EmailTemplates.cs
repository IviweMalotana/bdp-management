namespace BDP.API.Services;

/// <summary>
/// Rhode-skin HTML email templates for BDP storefront transactional emails.
///
/// Design system:
///   Cream    #F5EFE6  — page background
///   Warm     #FEFCFA  — card background
///   Sand     #C9B8A8  — borders, dividers
///   Ink      #1C1A17  — headings, totals
///   Muted    #4A4540  — body text, labels
///   Blush    #D4A89A  — accent / highlight
///   Soft     #9E8F83  — secondary / captions
///   Font     Georgia, 'Times New Roman', serif  (Cormorant Garamond substitute for email clients)
///   Border   2px solid #C9B8A8 (card edges)
///
/// Usage:
///   var html = EmailTemplates.OrderConfirmation(new OrderConfirmationData(...));
///   await _email.SendAsync(email, name, $"Your BDP order #{orderNumber}", html);
///
/// Wire-up note:
///   Configure SMTP via appsettings (Email:SmtpHost, SmtpPort, SmtpUser, SmtpPassword,
///   FromName, FromAddress) or Railway env vars with double-underscore notation.
///   EmailService.SendAsync() silently skips sending when SmtpHost is absent.
/// </summary>
public static class EmailTemplates
{
    // ── Shared chrome ──────────────────────────────────────────────────────────

    private static string Wrap(string title, string innerHtml) => $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>{title}</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">

          <!-- Logo / wordmark -->
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;
                         color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;
                         text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              {innerHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">
                BDP Packaging Co. · South Africa
              </p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">
                You received this email because you placed an order with us.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    private static string Divider() =>
        @"<tr><td style=""padding:24px 0;"">
           <div style=""height:1px;background:#C9B8A8;""></div>
         </td></tr>";

    private static string Label(string text) =>
        $@"<span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">{text}</span>";

    private static string TotalsRow(string label, string value, bool bold = false) =>
        bold
            ? $@"<tr>
                   <td style=""padding:8px 0 0;font-size:14px;color:#1C1A17;font-weight:bold;"">{label}</td>
                   <td align=""right"" style=""padding:8px 0 0;font-size:14px;color:#1C1A17;font-weight:bold;"">{value}</td>
                 </tr>"
            : $@"<tr>
                   <td style=""padding:4px 0;font-size:13px;color:#4A4540;"">{label}</td>
                   <td align=""right"" style=""padding:4px 0;font-size:13px;color:#4A4540;"">{value}</td>
                 </tr>";

    // ── Order confirmation ─────────────────────────────────────────────────────

    public record OrderConfirmationData(
        string RecipientName,
        string OrderNumber,
        string OrderDate,
        IEnumerable<OrderLineData> Lines,
        decimal SubtotalZAR,
        decimal ShippingZAR,
        decimal TotalZAR,
        string? ShippingServiceName,
        int? TransitDaysMin,
        int? TransitDaysMax,
        string ShippingAddress,
        string StorefrontUrl = "https://bdp.co.za"
    );

    public record OrderLineData(string ProductName, string Sku, int Quantity, decimal UnitPrice, decimal LineTotal);

    public static string OrderConfirmation(OrderConfirmationData d)
    {
        // Line items rows
        var lineRows = string.Concat(d.Lines.Select(line => $@"
          <tr>
            <td style=""padding:12px 0;border-bottom:1px solid #E8E0D8;"">
              <p style=""margin:0;font-size:14px;color:#1C1A17;"">{line.ProductName}</p>
              <p style=""margin:3px 0 0;font-size:12px;color:#9E8F83;"">SKU {line.Sku} &nbsp;·&nbsp; Qty {line.Quantity}</p>
            </td>
            <td align=""right"" style=""padding:12px 0;border-bottom:1px solid #E8E0D8;vertical-align:top;"">
              <p style=""margin:0;font-size:14px;color:#1C1A17;"">R {line.LineTotal:N2}</p>
              <p style=""margin:3px 0 0;font-size:12px;color:#9E8F83;"">R {line.UnitPrice:N2} each</p>
            </td>
          </tr>"));

        // Transit estimate copy
        var transitCopy = (d.TransitDaysMin.HasValue && d.TransitDaysMax.HasValue)
            ? $"Estimated delivery <strong>{d.TransitDaysMin}–{d.TransitDaysMax} business days</strong> from dispatch."
            : "Estimated delivery will be confirmed once your order ships.";

        var shippingLine = string.IsNullOrWhiteSpace(d.ShippingServiceName) ? "Shipping" : $"Shipping ({d.ShippingServiceName})";

        var inner = $@"
          <!-- Heading -->
          <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;
                      color:#1C1A17;font-weight:normal;"">Thank you, {EscHtml(d.RecipientName)}.</h1>
          <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">
            Your order has been received and is being prepared.
          </p>

          <!-- Order meta -->
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            <tr>
              <td style=""padding-right:24px;"">
                {Label("Order")}
                <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{EscHtml(d.OrderNumber)}</p>
              </td>
              <td>
                {Label("Date")}
                <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{EscHtml(d.OrderDate)}</p>
              </td>
            </tr>
          </table>

          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {Divider()}
          </table>

          <!-- Line items -->
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {lineRows}
          </table>

          <!-- Totals -->
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-top:16px;"">
            {TotalsRow("Subtotal", $"R {d.SubtotalZAR:N2}")}
            {TotalsRow(shippingLine, $"R {d.ShippingZAR:N2}")}
            <tr><td colspan=""2"" style=""padding:8px 0 0;"">
              <div style=""height:1px;background:#C9B8A8;""></div>
            </td></tr>
            {TotalsRow("Total", $"R {d.TotalZAR:N2}", bold: true)}
          </table>

          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {Divider()}
          </table>

          <!-- Shipping details -->
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            <tr>
              <td style=""padding-right:24px;vertical-align:top;"">
                {Label("Delivery address")}
                <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;line-height:1.6;"">{EscHtml(d.ShippingAddress).Replace("\n", "<br>")}</p>
              </td>
              <td style=""vertical-align:top;"">
                {Label("Shipping method")}
                <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;"">{EscHtml(d.ShippingServiceName ?? "Standard")}</p>
                <p style=""margin:6px 0 0;font-size:12px;color:#9E8F83;line-height:1.5;"">{transitCopy}</p>
              </td>
            </tr>
          </table>

          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {Divider()}
          </table>

          <!-- CTA -->
          <p style=""margin:0 0 20px;font-size:13px;color:#4A4540;"">
            You can view your order status and tracking updates in your account.
          </p>
          <a href=""{EscHtml(d.StorefrontUrl)}/account/orders""
             style=""display:inline-block;padding:12px 28px;background:#1C1A17;color:#F5EFE6;
                    font-family:Georgia,'Times New Roman',serif;font-size:13px;
                    letter-spacing:0.1em;text-decoration:none;border-radius:2px;"">
            View my order
          </a>
          <p style=""margin:24px 0 0;font-size:12px;color:#9E8F83;"">
            Questions? Reply to this email and we will get back to you promptly.
          </p>";

        return Wrap($"Order confirmed — {d.OrderNumber}", inner);
    }

    // ── Order shipped ──────────────────────────────────────────────────────────

    public record OrderShippedData(
        string RecipientName,
        string OrderNumber,
        string? TrackingNumber,
        string? TrackingCarrier,
        string? ShippingServiceName,
        int? TransitDaysMin,
        int? TransitDaysMax,
        string ShippingAddress,
        string StorefrontUrl = "https://bdp.co.za"
    );

    public static string OrderShipped(OrderShippedData d)
    {
        var trackingSection = !string.IsNullOrWhiteSpace(d.TrackingNumber)
            ? $@"
              <!-- Tracking highlight -->
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""background:#F5EFE6;border:1px solid #C9B8A8;border-radius:2px;
                               padding:20px 24px;margin-bottom:28px;"">
                    {Label("Tracking number")}
                    <p style=""margin:6px 0 8px;font-size:20px;font-family:'Courier New',monospace;
                               color:#1C1A17;letter-spacing:0.05em;"">{EscHtml(d.TrackingNumber)}</p>
                    <p style=""margin:0;font-size:12px;color:#9E8F83;"">Carrier: {EscHtml(d.TrackingCarrier ?? "YunExpress")}</p>
                    <p style=""margin:12px 0 0;"">
                      <a href=""https://www.aftership.com/track/yunexpress/{EscHtml(d.TrackingNumber)}""
                         style=""font-size:13px;color:#4A4540;text-decoration:underline;"">
                        Track on AfterShip ↗
                      </a>
                      &nbsp;&nbsp;
                      <a href=""{EscHtml(d.StorefrontUrl)}/account/orders""
                         style=""font-size:13px;color:#4A4540;text-decoration:underline;"">
                        View order ↗
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
              <div style=""height:24px;""></div>"
            : $@"<p style=""font-size:13px;color:#4A4540;"">
                   Your tracking number will be available in your account once the carrier scans your parcel.
                   <a href=""{EscHtml(d.StorefrontUrl)}/account/orders"" style=""color:#4A4540;"">Check your order →</a>
                 </p>";

        var transitCopy = (d.TransitDaysMin.HasValue && d.TransitDaysMax.HasValue)
            ? $"Expected to arrive within <strong>{d.TransitDaysMin}–{d.TransitDaysMax} business days</strong>."
            : "Expected arrival will be updated as your parcel moves through the network.";

        var inner = $@"
          <!-- Heading -->
          <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;
                      color:#1C1A17;font-weight:normal;"">Your order is on its way.</h1>
          <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">
            {EscHtml(d.RecipientName)}, order <strong>{EscHtml(d.OrderNumber)}</strong> has been dispatched.
          </p>

          {trackingSection}

          <!-- Transit copy -->
          <p style=""margin:0 0 24px;font-size:13px;color:#4A4540;line-height:1.6;"">
            {transitCopy}
          </p>

          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {Divider()}
          </table>

          <!-- Shipping details -->
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            <tr>
              <td style=""padding-right:24px;vertical-align:top;"">
                {Label("Delivery address")}
                <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;line-height:1.6;"">{EscHtml(d.ShippingAddress).Replace("\n", "<br>")}</p>
              </td>
              <td style=""vertical-align:top;"">
                {Label("Shipping method")}
                <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;"">{EscHtml(d.ShippingServiceName ?? "Standard")}</p>
              </td>
            </tr>
          </table>

          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
            {Divider()}
          </table>

          <!-- CTA -->
          <a href=""{EscHtml(d.StorefrontUrl)}/account/orders""
             style=""display:inline-block;padding:12px 28px;background:#1C1A17;color:#F5EFE6;
                    font-family:Georgia,'Times New Roman',serif;font-size:13px;
                    letter-spacing:0.1em;text-decoration:none;border-radius:2px;"">
            View order &amp; tracking
          </a>
          <p style=""margin:24px 0 0;font-size:12px;color:#9E8F83;"">
            Questions? Reply to this email and we will get back to you.
          </p>";

        return Wrap($"Your order is on its way — {d.OrderNumber}", inner);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static string EscHtml(string? s) =>
        System.Web.HttpUtility.HtmlEncode(s ?? string.Empty);
}
