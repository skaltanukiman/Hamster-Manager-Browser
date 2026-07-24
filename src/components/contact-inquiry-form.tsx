"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitContactInquiry,
  type ContactFormState
} from "@/app/actions/contact";
import { ContactCategoryBadge, ContactStatusBadge } from "@/components/contact-status-badge";
import {
  CONTACT_BODY_MAX_LENGTH,
  CONTACT_BODY_MIN_LENGTH,
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
  CONTACT_ERROR_ID_MAX_LENGTH,
  CONTACT_SOURCE_PATH_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  type ContactCategory,
  type ContactStatus
} from "@/lib/contact-inquiry-core";
import { formatDateTimeJst } from "@/lib/date";

const INITIAL_CONTACT_FORM_STATE: ContactFormState = {
  fieldErrors: {},
  formError: null,
  created: null
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-bold text-white hover:bg-moss/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      <Send className="h-4 w-4" aria-hidden />
      {pending ? "送信中..." : "問い合わせを送信"}
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-sm text-red-700">
      {message}
    </p>
  ) : null;
}

export function ContactInquiryForm({
  email,
  initialErrorId,
  initialSourcePath
}: {
  email: string | null;
  initialErrorId: string;
  initialSourcePath: string;
}) {
  const [state, formAction] = useActionState(submitContactInquiry, INITIAL_CONTACT_FORM_STATE);

  return (
    <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-ink">新しい問い合わせ</h3>
        <p className="mt-1 text-sm text-slate-600">
          送信後は、この画面の問い合わせ履歴から管理者とのやり取りを確認できます。
        </p>
      </div>

      {state.created ? (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">問い合わせを送信しました。</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-emerald-700">問い合わせ番号</dt>
              <dd className="mt-1 break-all font-semibold">{state.created.publicId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-emerald-700">現在の状態</dt>
              <dd className="mt-1">
                <ContactStatusBadge status={state.created.status as ContactStatus} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-emerald-700">問い合わせ種類</dt>
              <dd className="mt-1">
                <ContactCategoryBadge category={state.created.category as ContactCategory} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-emerald-700">受付日時</dt>
              <dd className="mt-1">{formatDateTimeJst(new Date(state.created.createdAt))}</dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-semibold text-emerald-700">件名</dt>
              <dd className="mt-1 break-words [overflow-wrap:anywhere]">{state.created.subject}</dd>
            </div>
          </dl>
          <Link
            href={`/contact/${state.created.publicId}`}
            className="mt-4 inline-flex min-h-10 items-center font-bold text-moss hover:underline"
          >
            問い合わせ詳細を確認する
          </Link>
        </div>
      ) : null}

      {state.formError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <form action={formAction} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          問い合わせ種類
          <select
            name="category"
            defaultValue="BUG"
            aria-invalid={Boolean(state.fieldErrors.category)}
            aria-describedby={state.fieldErrors.category ? "contact-category-error" : undefined}
          >
            {CONTACT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CONTACT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          <FieldError id="contact-category-error" message={state.fieldErrors.category} />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          件名
          <input
            name="subject"
            required
            maxLength={CONTACT_SUBJECT_MAX_LENGTH}
            aria-invalid={Boolean(state.fieldErrors.subject)}
            aria-describedby={state.fieldErrors.subject ? "contact-subject-error" : undefined}
          />
          <span className="text-xs font-normal text-slate-500">前後の空白を除いて1〜100文字</span>
          <FieldError id="contact-subject-error" message={state.fieldErrors.subject} />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          問い合わせ内容
          <textarea
            name="body"
            required
            minLength={CONTACT_BODY_MIN_LENGTH}
            maxLength={CONTACT_BODY_MAX_LENGTH}
            rows={8}
            className="min-h-40 resize-y"
            aria-invalid={Boolean(state.fieldErrors.body)}
            aria-describedby={state.fieldErrors.body ? "contact-body-error" : undefined}
          />
          <span className="text-xs font-normal text-slate-500">前後の空白を除いて10〜2,000文字</span>
          <FieldError id="contact-body-error" message={state.fieldErrors.body} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
            エラーID（任意）
            <input
              name="errorId"
              defaultValue={initialErrorId}
              maxLength={CONTACT_ERROR_ID_MAX_LENGTH}
              className="min-w-0"
              aria-invalid={Boolean(state.fieldErrors.errorId)}
              aria-describedby={state.fieldErrors.errorId ? "contact-error-id-error" : undefined}
            />
            <FieldError id="contact-error-id-error" message={state.fieldErrors.errorId} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
            発生した画面（任意）
            <input
              name="sourcePath"
              defaultValue={initialSourcePath}
              maxLength={CONTACT_SOURCE_PATH_MAX_LENGTH}
              placeholder="/settings"
              className="min-w-0"
              aria-invalid={Boolean(state.fieldErrors.sourcePath)}
              aria-describedby={state.fieldErrors.sourcePath ? "contact-source-path-error" : undefined}
            />
            <span className="text-xs font-normal text-slate-500">アプリ内の「/」から始まるパスだけ保存します。</span>
            <FieldError id="contact-source-path-error" message={state.fieldErrors.sourcePath} />
          </label>
        </div>

        <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
          返信先メールアドレス
          <input
            readOnly
            value={email || "メールアドレスを取得できません"}
            className="min-w-0 bg-slate-50 text-slate-600"
            aria-label="返信先メールアドレス（変更不可）"
          />
          <span className="text-xs font-normal text-slate-500">
            ログイン中のアカウント情報を使用します。この画面では変更できません。
          </span>
        </label>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
