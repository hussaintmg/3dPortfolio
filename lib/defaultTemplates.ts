import { DesignDoc, PAGE_PRESETS } from "./pdfDesigner";

const page = {
  ...PAGE_PRESETS.a4,
  background: "#ffffff",
  padding: 48,
};

/** Ready-made invoice layout the owner can duplicate and tweak. */
const invoiceDesign: DesignDoc = {
  page,
  elements: [
    {
      id: "el_brand",
      type: "text",
      x: 48,
      y: 44,
      w: 320,
      h: 34,
      props: { text: "{{site.name}}" },
      style: {
        fontSize: "24px",
        fontWeight: "800",
        color: "#0b0f19",
        fontFamily: "Inter, Arial, sans-serif",
      },
    },
    {
      id: "el_brandsub",
      type: "text",
      x: 48,
      y: 78,
      w: 320,
      h: 40,
      props: { text: "{{site.email}}<br/>{{site.address}}" },
      style: { fontSize: "12px", color: "#6b7280", lineHeight: "1.6" },
    },
    {
      id: "el_title",
      type: "text",
      x: 470,
      y: 44,
      w: 276,
      h: 40,
      props: { text: "INVOICE" },
      style: {
        fontSize: "30px",
        fontWeight: "800",
        color: "#6366f1",
        textAlign: "right",
        letterSpacing: "0.04em",
      },
    },
    {
      id: "el_number",
      type: "text",
      x: 470,
      y: 86,
      w: 276,
      h: 60,
      props: {
        text: "{{invoice.number}}<br/>Issued {{invoice.issuedAt}}<br/>Due {{invoice.dueDate}}",
      },
      style: { fontSize: "12px", color: "#6b7280", textAlign: "right", lineHeight: "1.7" },
    },
    {
      id: "el_rule",
      type: "line",
      x: 48,
      y: 168,
      w: 698,
      h: 2,
      props: {},
      style: { backgroundColor: "#e5e7eb" },
    },
    {
      id: "el_billto",
      type: "text",
      x: 48,
      y: 192,
      w: 340,
      h: 70,
      props: {
        text: "<strong style='font-size:11px;letter-spacing:.1em;color:#9ca3af;'>BILLED TO</strong><br/><span style='font-size:15px;font-weight:700;color:#111827;'>{{client.name}}</span><br/><span style='color:#6b7280;'>{{client.email}}</span>",
      },
      style: { fontSize: "13px", lineHeight: "1.7" },
    },
    {
      id: "el_pkg",
      type: "text",
      x: 470,
      y: 192,
      w: 276,
      h: 70,
      props: {
        text: "<strong style='font-size:11px;letter-spacing:.1em;color:#9ca3af;'>PACKAGE</strong><br/><span style='font-size:15px;font-weight:700;color:#111827;'>{{package.name}}</span>",
      },
      style: { fontSize: "13px", textAlign: "right", lineHeight: "1.7" },
    },
    {
      id: "el_table",
      type: "table",
      x: 48,
      y: 292,
      w: 698,
      h: 240,
      props: { columns: "Description|Qty|Rate|Amount" },
      style: { fontSize: "13px", color: "#111827" },
    },
    {
      id: "el_totalbox",
      type: "shape",
      x: 466,
      y: 556,
      w: 280,
      h: 66,
      props: { shape: "rect" },
      style: { backgroundColor: "#f8fafc", borderRadius: "10px" },
    },
    {
      id: "el_total",
      type: "text",
      x: 486,
      y: 574,
      w: 240,
      h: 34,
      props: {
        text: "<span style='font-size:11px;letter-spacing:.1em;color:#6b7280;'>TOTAL DUE</span><br/><span style='font-size:22px;font-weight:800;color:#0b0f19;'>{{invoice.total}}</span>",
      },
      style: { lineHeight: "1.4" },
    },
    {
      id: "el_qr",
      type: "qr",
      x: 48,
      y: 556,
      w: 92,
      h: 92,
      props: { url: "{{invoice.url}}" },
      style: {},
    },
    {
      id: "el_qrlabel",
      type: "text",
      x: 150,
      y: 584,
      w: 260,
      h: 40,
      props: { text: "Scan to view this invoice online" },
      style: { fontSize: "11px", color: "#9ca3af", lineHeight: "1.5" },
    },
    {
      id: "el_notes",
      type: "text",
      x: 48,
      y: 680,
      w: 698,
      h: 70,
      props: {
        text: "<strong style='font-size:11px;letter-spacing:.1em;color:#9ca3af;'>NOTES</strong><br/>{{invoice.notes}}",
      },
      style: { fontSize: "12px", color: "#374151", lineHeight: "1.7" },
    },
    {
      id: "el_footer",
      type: "text",
      x: 48,
      y: 1030,
      w: 698,
      h: 24,
      props: { text: "Thank you for your business — {{site.name}}" },
      style: { fontSize: "11px", color: "#9ca3af", textAlign: "center" },
    },
  ],
};

/** Minimal, clean alternative so there is a real choice of layout. */
const minimalDesign: DesignDoc = {
  page,
  elements: [
    {
      id: "m_title",
      type: "text",
      x: 48,
      y: 60,
      w: 698,
      h: 44,
      props: { text: "{{invoice.number}}" },
      style: { fontSize: "34px", fontWeight: "800", color: "#0b0f19" },
    },
    {
      id: "m_sub",
      type: "text",
      x: 48,
      y: 108,
      w: 698,
      h: 26,
      props: { text: "{{site.name}} · {{invoice.issuedAt}}" },
      style: { fontSize: "13px", color: "#6b7280" },
    },
    {
      id: "m_line",
      type: "line",
      x: 48,
      y: 156,
      w: 698,
      h: 1,
      props: {},
      style: { backgroundColor: "#e5e7eb" },
    },
    {
      id: "m_to",
      type: "text",
      x: 48,
      y: 182,
      w: 698,
      h: 44,
      props: { text: "For {{client.name}} — {{client.email}}" },
      style: { fontSize: "14px", color: "#111827" },
    },
    {
      id: "m_table",
      type: "table",
      x: 48,
      y: 250,
      w: 698,
      h: 260,
      props: { columns: "Description|Qty|Rate|Amount" },
      style: { fontSize: "13px", color: "#111827" },
    },
    {
      id: "m_total",
      type: "text",
      x: 48,
      y: 540,
      w: 698,
      h: 40,
      props: { text: "Total due: <strong>{{invoice.total}}</strong>" },
      style: { fontSize: "18px", color: "#0b0f19", textAlign: "right" },
    },
  ],
};

const emailHtml = `<div style="max-width:600px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;">
  <div style="padding:28px 0;border-bottom:2px solid #6366f1;">
    <h1 style="margin:0;font-size:22px;font-weight:800;">{{site.name}}</h1>
  </div>
  <div style="padding:28px 0;line-height:1.7;font-size:15px;">
    <p style="margin:0 0 16px;">Hi {{client.name}},</p>
    <p style="margin:0 0 16px;">
      Your invoice <strong>{{invoice.number}}</strong> for
      <strong>{{invoice.total}}</strong> is ready. It's attached to this email
      as a PDF, and you can also view it in your portal.
    </p>
    <p style="margin:0 0 24px;">Due date: <strong>{{invoice.dueDate}}</strong></p>
    <p style="margin:0 0 28px;">
      <a href="{{invoice.url}}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:700;font-size:13px;">View invoice</a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">{{invoice.notes}}</p>
  </div>
  <div style="padding:20px 0;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
    {{site.name}} · {{site.email}} · {{site.phone}}
  </div>
</div>`;

export const DEFAULT_TEMPLATES = [
  {
    name: "Invoice — Classic",
    type: "pdf",
    scope: "invoice",
    design: invoiceDesign,
    html: "",
    css: "",
    engine: "designer",
    isDefault: true,
    description: "Branded invoice with itemised table, totals panel and QR code.",
  },
  {
    name: "Invoice — Minimal",
    type: "pdf",
    scope: "invoice",
    design: minimalDesign,
    html: "",
    css: "",
    engine: "designer",
    isDefault: false,
    description: "Clean, typographic layout with no decoration.",
  },
  {
    name: "Invoice email",
    type: "email",
    scope: "invoice",
    subject: "Invoice {{invoice.number}} from {{site.name}}",
    html: emailHtml,
    css: "",
    design: { elements: [], page: {} },
    engine: "html",
    isDefault: true,
    description: "Sent with the invoice PDF attached.",
  },
];
