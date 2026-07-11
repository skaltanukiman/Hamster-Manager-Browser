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
