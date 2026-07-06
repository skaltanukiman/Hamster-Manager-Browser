"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useRef } from "react";

import { useButtonFormDirty } from "@/components/form-dirty-state";

type DirtySubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function DirtySubmitButton({ children, disabled = false, title, ...props }: DirtySubmitButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDirty = useButtonFormDirty(buttonRef, disabled);
  const isDisabled = disabled || !isDirty;

  return (
    <button
      {...props}
      ref={buttonRef}
      type="submit"
      disabled={isDisabled}
      title={title ?? (!disabled && !isDirty ? "変更すると保存できます" : undefined)}
    >
      {children}
    </button>
  );
}
