"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";

import { REALTIME_LOCAL_SUBMIT_EVENT } from "@/lib/realtime-constants";

type AutoSubmitInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AutoSubmitInput({ onChange, ...props }: AutoSubmitInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    const form = event.currentTarget.form;

    if (form && (form.method.toLowerCase() !== "get" || form.hasAttribute("data-dirty-watch"))) {
      window.dispatchEvent(new CustomEvent(REALTIME_LOCAL_SUBMIT_EVENT, { detail: { form } }));
    }

    form?.requestSubmit();
  }

  return <input {...props} onChange={handleChange} />;
}
