/**
 * Where a notification should take you when you click it.
 *
 * The same event lands in two different places depending on who is reading
 * it: a new message is `/dashboard/chat/<id>` for the owner and `/portal/chat`
 * for the client it belongs to. Resolving that here keeps the rule in one
 * place — the service worker just follows the url it is handed.
 */

export type NotificationType =
  | "enquiry"
  | "subscriber"
  | "chat"
  | "payment"
  | "invoice"
  | "assignment"
  | "document"
  | "system";

export type Audience = "owner" | "admin" | "user";

export interface RouteMeta {
  /** Conversation, invoice, enquiry… whatever the notification is about. */
  entityId?: string;
  /** Overrides everything when the caller already knows the exact path. */
  explicit?: string;
}

const STAFF: Record<NotificationType, (m: RouteMeta) => string> = {
  enquiry: () => "/dashboard/enquiries",
  subscriber: () => "/dashboard/subscribers",
  chat: (m) => (m.entityId ? `/dashboard/chat?c=${m.entityId}` : "/dashboard/chat"),
  payment: () => "/dashboard/payments",
  invoice: (m) => (m.entityId ? `/dashboard/invoices?i=${m.entityId}` : "/dashboard/invoices"),
  assignment: () => "/dashboard/assignments",
  document: () => "/dashboard/documents",
  system: () => "/dashboard",
};

const CLIENT: Record<NotificationType, (m: RouteMeta) => string> = {
  enquiry: () => "/portal",
  subscriber: () => "/portal",
  chat: () => "/portal/chat",
  payment: () => "/portal/invoices",
  invoice: (m) => (m.entityId ? `/portal/invoices?i=${m.entityId}` : "/portal/invoices"),
  assignment: () => "/portal",
  document: () => "/portal",
  system: () => "/portal",
};

export function resolveNotificationUrl(
  type: NotificationType,
  audience: Audience,
  meta: RouteMeta = {},
): string {
  if (meta.explicit) return meta.explicit;
  const table = audience === "user" ? CLIENT : STAFF;
  const build = table[type] || table.system;
  return build(meta);
}
