"use client";

import { Save, UserRound } from "lucide-react";

import { updateUserProfile } from "@/app/actions/settings";
import { DirtySubmitButton } from "@/components/dirty-submit-button";

type ProfileSettingsFormProps = {
  name?: string | null;
  email?: string | null;
};

export function ProfileSettingsForm({ name, email }: ProfileSettingsFormProps) {
  return (
    <form action={updateUserProfile} data-dirty-watch className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-moss" aria-hidden />
        <h3 className="text-base font-bold text-ink">プロフィール</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          表示名
          <input name="name" required maxLength={50} defaultValue={name ?? ""} placeholder="例: 山田 太郎" />
          <span className="text-xs font-normal text-slate-500">ヘッダーや共有メンバー一覧に表示されます。</span>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          メールアドレス
          <input value={email ?? "未設定"} readOnly disabled className="bg-slate-50 text-slate-500" />
          <span className="text-xs font-normal text-slate-500">Googleアカウントのメールアドレスです。</span>
        </label>
      </div>

      <div className="flex justify-end">
        <DirtySubmitButton className="inline-flex items-center gap-2 rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300">
          <Save className="h-4 w-4" aria-hidden />
          保存
        </DirtySubmitButton>
      </div>
    </form>
  );
}
