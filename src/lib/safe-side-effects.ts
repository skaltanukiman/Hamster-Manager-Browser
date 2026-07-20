import { revalidatePath } from "next/cache";

import { logUnexpectedError } from "@/lib/server-errors";

type RevalidateTarget = {
  path: string;
  type?: "layout" | "page";
};

export function revalidatePathsSafely(
  targets: RevalidateTarget[],
  operation: string,
  context?: Record<string, string | number | boolean | null | undefined>
) {
  // DB commit後のcache無効化失敗は業務更新を失敗扱いにせず、個別に記録して残りも試行する。
  for (const target of targets) {
    try {
      if (target.type) {
        revalidatePath(target.path, target.type);
      } else {
        revalidatePath(target.path);
      }
    } catch (error) {
      logUnexpectedError(error, {
        operation,
        context: {
          ...context,
          revalidatePath: target.path
        }
      });
    }
  }
}
