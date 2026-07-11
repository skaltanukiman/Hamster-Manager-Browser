import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { redirect, unstable_rethrow } from "next/navigation";

type LogContextValue = string | number | boolean | null | undefined;

export type UnexpectedErrorLogOptions = {
  operation: string;
  context?: Record<string, LogContextValue>;
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...[truncated]`;
}

function redactSecrets(value: string) {
  return value
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1[REDACTED]$2")
    .replace(/(bearer\s+)[a-z0-9._~+\/-]+/gi, "$1[REDACTED]")
    .replace(/((?:token|secret|password)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}

function safeText(value: string, maxLength: number) {
  return truncate(redactSecrets(value), maxLength);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;

    return {
      name: error.name,
      code,
      message: safeText(error.message, MAX_MESSAGE_LENGTH),
      stack: error.stack ? safeText(error.stack, MAX_STACK_LENGTH) : undefined
    };
  }

  return {
    name: typeof error,
    message: safeText(String(error), MAX_MESSAGE_LENGTH)
  };
}

function sanitizeContext(context: Record<string, LogContextValue> | undefined) {
  if (!context) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, typeof value === "string" ? safeText(value, 256) : value])
  );
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function logUnexpectedError(error: unknown, options: UnexpectedErrorLogOptions) {
  const errorId = randomUUID();
  const payload = {
    level: "error",
    errorId,
    operation: options.operation,
    occurredAt: new Date().toISOString(),
    context: sanitizeContext(options.context),
    error: serializeError(error)
  };

  console.error(JSON.stringify(payload));
  return errorId;
}

export function createSystemErrorUrl(pathname: string, errorId: string, currentParams?: URLSearchParams) {
  const params = new URLSearchParams(currentParams);
  params.set("status", "systemError");
  params.set("errorId", errorId);
  return `${pathname}?${params.toString()}`;
}

export function handleServerActionError(
  error: unknown,
  options: UnexpectedErrorLogOptions & {
    pathname: string;
    searchParams?: URLSearchParams;
  }
): never {
  // redirect() などNext.jsが制御フローに使う内部例外は、通常の障害として記録・変換しない。
  unstable_rethrow(error);
  const errorId = logUnexpectedError(error, options);
  redirect(createSystemErrorUrl(options.pathname, errorId, options.searchParams));
}
