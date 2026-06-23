using BDP.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Data;

public static class EmailTemplateSeeder
{
    private static readonly Dictionary<string, Func<string>> HtmlBodyFactories = new()
    {
        ["order_confirmation"] = OrderConfirmationHtml,
        ["order_shipped"] = OrderShippedHtml,
        ["invoice_sent"] = InvoiceSentHtml,
        ["recurring_order_generated"] = RecurringOrderGeneratedHtml,
        ["b2b_approved"] = B2BApprovedHtml,
    };

    public static string GetDefault(string key) =>
        HtmlBodyFactories.TryGetValue(key, out var factory) ? factory() : string.Empty;

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.EmailTemplates.AnyAsync()) return;

        var templates = new List<EmailTemplate>
        {
            new()
            {
                Key = "order_confirmation",
                Name = "Order Confirmation",
                Description = "Sent to the customer when their order is placed and confirmed.",
                Subject = "Order confirmed — {{OrderNumber}}",
                HtmlBody = OrderConfirmationHtml(),
                UpdatedAt = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc),
            },
            new()
            {
                Key = "order_shipped",
                Name = "Order Shipped",
                Description = "Sent when the order is marked as shipped with a tracking number.",
                Subject = "Your BDP order {{OrderNumber}} is on its way",
                HtmlBody = OrderShippedHtml(),
                UpdatedAt = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc),
            },
            new()
            {
                Key = "invoice_sent",
                Name = "Invoice",
                Description = "Sent to B2B clients when an invoice is issued.",
                Subject = "Invoice {{InvoiceNumber}} from BDP Packaging",
                HtmlBody = InvoiceSentHtml(),
                UpdatedAt = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc),
            },
            new()
            {
                Key = "recurring_order_generated",
                Name = "Recurring Order Generated",
                Description = "Sent to B2B clients when a recurring order is automatically generated.",
                Subject = "Order Generated: {{OrderNumber}}",
                HtmlBody = RecurringOrderGeneratedHtml(),
                UpdatedAt = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc),
            },
            new()
            {
                Key = "b2b_approved",
                Name = "B2B Account Approved",
                Description = "Sent to a business when their B2B account application is approved.",
                Subject = "Your B2B account has been approved — BDP Packaging",
                HtmlBody = B2BApprovedHtml(),
                UpdatedAt = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc),
            },
        };

        db.EmailTemplates.AddRange(templates);
        await db.SaveChangesAsync();
    }

    // ── Default HTML bodies (copied from EmailTemplates.cs static methods) ─────

    private static string OrderConfirmationHtml() => @"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Order confirmed — {{OrderNumber}}</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;font-weight:normal;"">Thank you, {{RecipientName}}.</h1>
              <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">Your order has been received and is being prepared.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""padding-right:24px;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Order</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{{OrderNumber}}</p>
                  </td>
                  <td>
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Date</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{{OrderDate}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0 0 16px;font-size:13px;color:#4A4540;"">{{LineItems}}</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-top:16px;"">
                <tr><td style=""padding:4px 0;font-size:13px;color:#4A4540;"">Subtotal</td><td align=""right"" style=""padding:4px 0;font-size:13px;color:#4A4540;"">R {{SubtotalZAR}}</td></tr>
                <tr><td style=""padding:4px 0;font-size:13px;color:#4A4540;"">Shipping</td><td align=""right"" style=""padding:4px 0;font-size:13px;color:#4A4540;"">R {{ShippingZAR}}</td></tr>
                <tr><td colspan=""2"" style=""padding:8px 0 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
                <tr><td style=""padding:8px 0 0;font-size:14px;color:#1C1A17;font-weight:bold;"">Total</td><td align=""right"" style=""padding:8px 0 0;font-size:14px;color:#1C1A17;font-weight:bold;"">R {{TotalZAR}}</td></tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""padding-right:24px;vertical-align:top;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Delivery address</span>
                    <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;line-height:1.6;"">{{ShippingAddress}}</p>
                  </td>
                  <td style=""vertical-align:top;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Shipping method</span>
                    <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;"">{{ShippingServiceName}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0 0 20px;font-size:13px;color:#4A4540;"">You can view your order status and tracking updates in your account.</p>
              <a href=""{{StorefrontUrl}}/account/orders"" style=""display:inline-block;padding:12px 28px;background:#1C1A17;color:#F5EFE6;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.1em;text-decoration:none;border-radius:2px;"">View my order</a>
              <p style=""margin:24px 0 0;font-size:12px;color:#9E8F83;"">Questions? Reply to this email and we will get back to you promptly.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">BDP Packaging Co. · South Africa</p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">You received this email because you placed an order with us.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    private static string OrderShippedHtml() => @"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Your order is on its way — {{OrderNumber}}</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;font-weight:normal;"">Your order is on its way.</h1>
              <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">{{RecipientName}}, order <strong>{{OrderNumber}}</strong> has been dispatched.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""background:#F5EFE6;border:1px solid #C9B8A8;border-radius:2px;padding:20px 24px;margin-bottom:28px;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Tracking number</span>
                    <p style=""margin:6px 0 8px;font-size:20px;font-family:'Courier New',monospace;color:#1C1A17;letter-spacing:0.05em;"">{{TrackingNumber}}</p>
                    <p style=""margin:0;font-size:12px;color:#9E8F83;"">Carrier: {{TrackingCarrier}}</p>
                    <p style=""margin:12px 0 0;"">
                      <a href=""https://www.aftership.com/track/yunexpress/{{TrackingNumber}}"" style=""font-size:13px;color:#4A4540;text-decoration:underline;"">Track on AfterShip &#8599;</a>
                      &nbsp;&nbsp;
                      <a href=""{{StorefrontUrl}}/account/orders"" style=""font-size:13px;color:#4A4540;text-decoration:underline;"">View order &#8599;</a>
                    </p>
                  </td>
                </tr>
              </table>
              <div style=""height:24px;""></div>
              <p style=""margin:0 0 24px;font-size:13px;color:#4A4540;line-height:1.6;"">Expected arrival will be updated as your parcel moves through the network.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""padding-right:24px;vertical-align:top;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Delivery address</span>
                    <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;line-height:1.6;"">{{ShippingAddress}}</p>
                  </td>
                  <td style=""vertical-align:top;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Shipping method</span>
                    <p style=""margin:4px 0 0;font-size:13px;color:#4A4540;"">{{ShippingServiceName}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <a href=""{{StorefrontUrl}}/account/orders"" style=""display:inline-block;padding:12px 28px;background:#1C1A17;color:#F5EFE6;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.1em;text-decoration:none;border-radius:2px;"">View order &amp; tracking</a>
              <p style=""margin:24px 0 0;font-size:12px;color:#9E8F83;"">Questions? Reply to this email and we will get back to you.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">BDP Packaging Co. · South Africa</p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">You received this email because you placed an order with us.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    private static string InvoiceSentHtml() => @"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Invoice {{InvoiceNumber}} from BDP Packaging</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;font-weight:normal;"">Invoice {{InvoiceNumber}}</h1>
              <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">Dear {{ClientName}}, please find your invoice attached.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""padding-right:24px;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Invoice</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{{InvoiceNumber}}</p>
                  </td>
                  <td>
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Amount Due</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;font-weight:bold;"">R {{TotalZAR}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0 0 16px;font-size:13px;color:#4A4540;line-height:1.6;"">The invoice PDF is attached to this email. Please process payment at your earliest convenience.</p>
              <p style=""margin:0;font-size:13px;color:#4A4540;line-height:1.6;"">If you have any questions regarding this invoice, please reply to this email.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0;font-size:12px;color:#9E8F83;"">Regards,<br/>BDP Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">BDP Packaging Co. · South Africa</p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">You received this email because you are a registered B2B client.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    private static string RecurringOrderGeneratedHtml() => @"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Order Generated: {{OrderNumber}}</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;font-weight:normal;"">Recurring Order Generated</h1>
              <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">Dear {{RecipientName}}, your recurring order has been automatically generated.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""padding-right:24px;"">
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Recurring Order</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{{RecurringOrderName}}</p>
                  </td>
                  <td>
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Order Number</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;"">{{OrderNumber}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td>
                    <span style=""font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#9E8F83;"">Total</span>
                    <p style=""margin:4px 0 0;font-size:15px;color:#1C1A17;font-weight:bold;"">R {{TotalZAR}}</p>
                  </td>
                </tr>
              </table>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0;font-size:13px;color:#4A4540;line-height:1.6;"">Our team will be in touch to confirm delivery details.</p>
              <p style=""margin:16px 0 0;font-size:12px;color:#9E8F83;"">Regards,<br/>BDP Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">BDP Packaging Co. · South Africa</p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">You received this email because you have a recurring order set up with us.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    private static string B2BApprovedHtml() => @"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <title>Your B2B account has been approved</title>
</head>
<body style=""margin:0;padding:0;background:#F5EFE6;font-family:Georgia,'Times New Roman',serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" border=""0""
         style=""background:#F5EFE6;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" border=""0""
               style=""max-width:600px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:0 0 32px;"">
              <p style=""margin:0;font-size:28px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;letter-spacing:0.15em;text-transform:uppercase;"">BDP</p>
              <p style=""margin:4px 0 0;font-size:11px;color:#9E8F83;letter-spacing:0.2em;text-transform:uppercase;"">Packaging Co.</p>
            </td>
          </tr>
          <tr>
            <td style=""background:#FEFCFA;border:2px solid #C9B8A8;border-radius:2px;padding:40px 36px;"">
              <h1 style=""margin:0 0 4px;font-size:26px;font-family:Georgia,'Times New Roman',serif;color:#1C1A17;font-weight:normal;"">Welcome to BDP B2B.</h1>
              <p style=""margin:0 0 28px;font-size:14px;color:#4A4540;"">Dear {{ContactName}}, your B2B account application has been approved.</p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0 0 16px;font-size:13px;color:#4A4540;line-height:1.6;"">
                Your business account for <strong>{{CompanyName}}</strong> is now active. You can now:
              </p>
              <ul style=""margin:0 0 24px;padding-left:20px;font-size:13px;color:#4A4540;line-height:2;"">
                <li>Place B2B orders with your negotiated pricing</li>
                <li>Set up recurring orders</li>
                <li>Access invoices and order history</li>
                <li>Request custom packaging solutions</li>
              </ul>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr><td style=""padding:24px 0;""><div style=""height:1px;background:#C9B8A8;""></div></td></tr>
              </table>
              <p style=""margin:0 0 20px;font-size:13px;color:#4A4540;"">
                A member of our team will be in touch shortly to walk you through your account and discuss your packaging needs.
              </p>
              <p style=""margin:0;font-size:12px;color:#9E8F83;"">
                Questions? Reply to this email and we will get back to you promptly.<br/><br/>
                Regards,<br/>BDP Packaging Co.
              </p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:32px 0 0;"">
              <p style=""margin:0;font-size:11px;color:#9E8F83;letter-spacing:0.1em;"">BDP Packaging Co. · South Africa</p>
              <p style=""margin:6px 0 0;font-size:11px;color:#C9B8A8;"">You received this email because you applied for a B2B account with us.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
}
