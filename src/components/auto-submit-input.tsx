"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";

type AutoSubmitInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AutoSubmitInput({ onChange, ...props }: AutoSubmitInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    event.currentTarget.form?.requestSubmit();
  }

  return <input {...props} onChange={handleChange} />;
}
