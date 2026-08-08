import QRCode from "qrcode";
import dbConnect from "@/lib/mongoose";
import Variable from "@/models/Variable";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import PackageAssignment from "@/models/PackageAssignment";
import SiteSettings from "@/models/SiteSettings";

/** Built-in variables seeded on first use so the palette is never empty. */
export const BUILTIN_VARIABLES = [
  /**
   * The line items. A list, not a value — it feeds a table element via
   * `{{table:items}}` and cannot be dropped into a text box. It was missing
   * from this list entirely, which is why an invoice's table looked like it
   * had no variable behind it at all.
   */
  {
    key: "items",
    label: "Invoice line items (list)",
    group: "Invoice",
    path: "items",
    sample: "Design · 1 × 499",
    description:
      "Drop a Table element on the page — it renders one row per item automatically.",
    isArray: true,
  },
  { key: "client.name", label: "Client name", group: "Client", path: "client.name", sample: "Ayesha Khan" },
  { key: "client.email", label: "Client email", group: "Client", path: "client.email", sample: "ayesha@example.com" },
  { key: "client.username", label: "Client username", group: "Client", path: "client.username", sample: "ayeshak" },
  { key: "invoice.number", label: "Invoice number", group: "Invoice", path: "invoice.number", sample: "INV-0001" },
  { key: "invoice.total", label: "Invoice total", group: "Invoice", path: "invoice.totalFormatted", sample: "USD 499" },
  { key: "invoice.subtotal", label: "Subtotal", group: "Invoice", path: "invoice.subtotalFormatted", sample: "USD 549" },
  { key: "invoice.discount", label: "Discount", group: "Invoice", path: "invoice.discountFormatted", sample: "USD 50" },
  { key: "invoice.status", label: "Status", group: "Invoice", path: "invoice.status", sample: "unpaid" },
  { key: "invoice.issuedAt", label: "Issue date", group: "Invoice", path: "invoice.issuedAtFormatted", sample: "08/08/2026" },
  { key: "invoice.dueDate", label: "Due date", group: "Invoice", path: "invoice.dueDateFormatted", sample: "01/09/2026" },
  { key: "invoice.notes", label: "Notes", group: "Invoice", path: "invoice.notes", sample: "Bank transfer accepted." },
  { key: "invoice.url", label: "Invoice link", group: "Invoice", path: "invoice.url", sample: "https://example.com/portal/invoices/1" },
  { key: "package.name", label: "Package name", group: "Package", path: "package.name", sample: "Starter Website" },
  { key: "package.price", label: "Package price", group: "Package", path: "package.priceFormatted", sample: "USD 399" },
  { key: "site.name", label: "Website name", group: "Site", path: "site.name", sample: "Cybogen" },
  { key: "site.email", label: "Your email", group: "Site", path: "site.email", sample: "hello@example.com" },
  { key: "site.phone", label: "Your phone", group: "Site", path: "site.phone", sample: "+92 300 0000000" },
  { key: "site.address", label: "Your address", group: "Site", path: "site.address", sample: "Pakistan" },
  { key: "site.url", label: "Website URL", group: "Site", path: "site.url", sample: "https://example.com" },
  { key: "today", label: "Today's date", group: "General", path: "today", sample: "08/08/2026" },
];

/** Creates any missing built-ins. Safe to call on every request. */
export async function ensureBuiltinVariables() {
  await dbConnect();
  const ops = BUILTIN_VARIABLES.map((v) => ({
    updateOne: {
      filter: { key: v.key },
      update: { $setOnInsert: { ...v, system: true } },
      upsert: true,
    },
  }));
  await Variable.bulkWrite(ops as any);
}

export interface RenderContext {
  [key: string]: any;
}

/**
 * Assembles the real data a template can draw on. Everything is loaded from
 * the database here — templates never receive raw model documents.
 */
export async function buildContext(opts: {
  invoiceId?: string;
  userId?: string;
  baseUrl?: string;
}): Promise<RenderContext> {
  await dbConnect();

  const settings: any =
    (await SiteSettings.findOne({ key: "global" }).lean()) || {};
  const baseUrl =
    opts.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const money = (amount: number | undefined, currency = "USD") =>
    amount == null ? "" : `${currency} ${amount}`;
  const date = (d: any) => (d ? new Date(d).toLocaleDateString() : "");

  const ctx: RenderContext = {
    site: {
      name: settings.websiteName || "Portfolio",
      email: settings.email || "",
      phone: settings.phone || "",
      address: settings.address || "",
      url: baseUrl,
      logo: settings.faviconUrl || "",
    },
    today: new Date().toLocaleDateString(),
    client: {},
    invoice: {},
    package: {},
    items: [],
  };

  let invoice: any = null;
  if (opts.invoiceId) {
    invoice = await Invoice.findById(opts.invoiceId).lean();
  }

  const userId = invoice?.userId || opts.userId;
  if (userId && /^[0-9a-f]{24}$/i.test(String(userId))) {
    const user: any = await User.findById(userId)
      .select("username displayName email")
      .lean();
    if (user) {
      ctx.client = {
        name: user.displayName || user.username || "",
        username: user.username || "",
        email: user.email || "",
        id: String(user._id),
      };
    }

    const assignment: any = await PackageAssignment.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    if (assignment) {
      ctx.package = {
        name: assignment.packageName || "",
        price: assignment.price,
        priceFormatted: money(assignment.price, assignment.currency),
        status: assignment.status,
        projectUrl: assignment.projectUrl || "",
      };
    }
  }

  if (invoice) {
    ctx.invoice = {
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      subtotalFormatted: money(invoice.subtotal, invoice.currency),
      discount: invoice.discount,
      discountFormatted: money(invoice.discount, invoice.currency),
      total: invoice.total,
      totalFormatted: money(invoice.total, invoice.currency),
      notes: invoice.notes || "",
      paymentMethod: invoice.paymentMethod || "",
      issuedAtFormatted: date(invoice.issuedAt),
      dueDateFormatted: date(invoice.dueDate),
      paidAtFormatted: date(invoice.paidAt),
      url: `${baseUrl}/portal/invoices/${invoice._id}`,
    };
    ctx.items = (invoice.items || []).map((i: any) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: money(i.unitPrice, invoice.currency),
      amount: money(i.quantity * i.unitPrice, invoice.currency),
    }));
    if (!ctx.client.name && invoice.clientName) {
      ctx.client = { name: invoice.clientName, email: invoice.clientEmail };
    }
    if (invoice.packageName && !ctx.package.name) {
      ctx.package.name = invoice.packageName;
    }
  }

  return ctx;
}

const getPath = (obj: any, path: string) =>
  path.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);

/**
 * Replaces every {{key}} using the Variable definitions (key → context path),
 * falling back to treating the key itself as a context path.
 */
export async function resolveVariables(
  html: string,
  context: RenderContext,
): Promise<string> {
  await dbConnect();
  const vars: any[] = await Variable.find().lean();
  const byKey = new Map(vars.map((v) => [v.key, v]));

  return html.replace(/\{\{\s*([a-zA-Z0-9_.:-]+)\s*\}\}/g, (match, rawKey) => {
    const key = String(rawKey).trim();

    // {{table:items}} is expanded separately
    if (key.startsWith("table:")) return match;

    const def = byKey.get(key);
    const path = def?.path || key;
    const value = getPath(context, path);

    if (value == null || value === "") return def?.fallback ?? "";
    return String(value);
  });
}

/** Renders {{table:items}} placeholders into a real table. */
export function renderTables(html: string, context: RenderContext): string {
  return html.replace(
    /<div([^>]*data-el="table"[^>]*)>([\s\S]*?)<\/div>/g,
    (full, attrs) => {
      const colsMatch = attrs.match(/data-columns="([^"]*)"/);
      const columns = (colsMatch?.[1] || "Description|Qty|Rate|Amount").split("|");
      const rows: any[] = Array.isArray(context.items) ? context.items : [];

      const head = columns
        .map(
          (c: string) =>
            `<th style="text-align:left;padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">${c}</th>`,
        )
        .join("");

      const body = rows
        .map((r) => {
          const cells = [r.description, r.quantity, r.unitPrice, r.amount]
            .slice(0, columns.length)
            .map(
              (v) =>
                `<td style="padding:9px 6px;border-bottom:1px solid #f3f4f6;">${v ?? ""}</td>`,
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `<div${attrs}><table style="width:100%;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${
        body ||
        `<tr><td colspan="${columns.length}" style="padding:12px 6px;color:#9ca3af;">No items</td></tr>`
      }</tbody></table></div>`;
    },
  );
}

/** Turns every QR element into an embedded PNG data URI. */
export async function renderQrCodes(html: string): Promise<string> {
  const matches = [...html.matchAll(/<img([^>]*data-el="qr"[^>]*)>/g)];
  let output = html;

  for (const m of matches) {
    const attrs = m[1];
    const urlMatch = attrs.match(/data-url="([^"]*)"/);
    const url = urlMatch?.[1] || "";
    if (!url) continue;

    try {
      const dataUri = await QRCode.toDataURL(url, {
        margin: 1,
        width: 400,
        errorCorrectionLevel: "M",
      });
      const withSrc = m[0].replace(/src="[^"]*"/, `src="${dataUri}"`);
      output = output.replace(m[0], withSrc);
    } catch {
      // A bad URL shouldn't sink the whole document
    }
  }

  return output;
}

/** Full pipeline: variables → tables → QR codes. */
export async function renderTemplateHtml(
  html: string,
  context: RenderContext,
): Promise<string> {
  let out = renderTables(html, context);
  out = await resolveVariables(out, context);
  out = await renderQrCodes(out);
  return out;
}

/** Wraps rendered body HTML in a printable document shell. */
export function wrapDocument(body: string, css = "") {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:0;font-family:Inter,Arial,Helvetica,sans-serif;background:#fff;}
  img{max-width:100%;}
  ${css}
</style>
</head><body>${body}</body></html>`;
}
