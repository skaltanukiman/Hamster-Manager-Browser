"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";

type HamsterThumbnailProps = {
  hamsterId: string;
  hamsterName: string;
  profileImageFileName: string | null;
  size?: "dashboard" | "management";
};

export function HamsterThumbnail({
  hamsterId,
  hamsterName,
  profileImageFileName,
  size = "dashboard"
}: HamsterThumbnailProps) {
  const [failedVersion, setFailedVersion] = useState<string | null>(null);
  const showImage = Boolean(profileImageFileName && failedVersion !== profileImageFileName);
  const sizeClass = size === "dashboard" ? "h-24 w-24 md:h-28 md:w-28" : "h-24 w-24";

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm`}
    >
      {showImage ? (
        // 認証CookieをそのままRoute Handlerへ送るため、画像最適化プロキシは使わない。
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/hamsters/${encodeURIComponent(hamsterId)}/image?v=${encodeURIComponent(profileImageFileName ?? "")}`}
          alt={`${hamsterName}のプロフィール画像`}
          className="h-full w-full object-cover"
          onError={() => setFailedVersion(profileImageFileName)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400" aria-label="プロフィール画像未登録">
          <ImageOff className="h-7 w-7" aria-hidden />
          <span className="text-[10px] font-medium">画像未登録</span>
        </div>
      )}
    </div>
  );
}
