"use client";

import Form from "next/form";
import {
  useEffect,
  useRef,
  type CompositionEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode
} from "react";

export function FilterClearButton({
  fieldNames,
  children,
  className
}: {
  fieldNames: string[];
  children: ReactNode;
  className?: string;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    for (const control of Array.from(form.elements)) {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) continue;
      if (!fieldNames.includes(control.name)) continue;

      if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) {
        control.checked = false;
      } else {
        control.value = "";
      }
    }

    form.requestSubmit();
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}

export function AutoSubmitFilterForm({
  action,
  children,
  className,
  debounceMs = 400,
  ignoreFieldNames = []
}: {
  action: string;
  children: ReactNode;
  className?: string;
  debounceMs?: number;
  ignoreFieldNames?: string[];
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function submitForControl(form: HTMLFormElement, control: HTMLInputElement | HTMLSelectElement) {
    if (ignoreFieldNames.includes(control.name)) return;

    clearTimer();
    const shouldDebounce = control instanceof HTMLInputElement && ["text", "search"].includes(control.type);
    if (shouldDebounce) {
      timerRef.current = setTimeout(() => form.requestSubmit(), debounceMs);
      return;
    }

    form.requestSubmit();
  }

  function handleChange(event: FormEvent<HTMLFormElement>) {
    if (composingRef.current) return;
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
    submitForControl(event.currentTarget, control);
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLFormElement>) {
    composingRef.current = false;
    const control = event.target;
    if (!(control instanceof HTMLInputElement)) return;
    submitForControl(event.currentTarget, control);
  }

  return (
    <Form
      action={action}
      scroll={false}
      className={className}
      onChange={handleChange}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={handleCompositionEnd}
      onSubmit={clearTimer}
    >
      {children}
    </Form>
  );
}
