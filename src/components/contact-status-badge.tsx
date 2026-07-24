import type { ContactCategory, ContactStatus } from "@/lib/contact-inquiry-core";
import {
  CONTACT_CATEGORY_LABELS,
  CONTACT_STATUS_LABELS
} from "@/lib/contact-inquiry-core";

const statusClasses: Record<ContactStatus, string> = {
  OPEN: "border-amber-200 bg-amber-50 text-amber-800",
  IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-800",
  WAITING_FOR_USER: "border-violet-200 bg-violet-50 text-violet-800",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-700"
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {CONTACT_STATUS_LABELS[status]}
    </span>
  );
}

export function ContactCategoryBadge({ category }: { category: ContactCategory }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {CONTACT_CATEGORY_LABELS[category]}
    </span>
  );
}
