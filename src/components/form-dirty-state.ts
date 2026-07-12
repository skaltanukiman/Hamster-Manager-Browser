"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

function isSubmittableControl(element: Element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function normalizeInputValue(input: HTMLInputElement) {
  if (input.type === "checkbox" || input.type === "radio") {
    return input.checked ? "checked" : "unchecked";
  }

  if (input.type === "number") {
    const value = input.value.trim();
    return value.length > 0 && Number.isFinite(Number(value)) ? String(Number(value)) : value;
  }

  if (input.type === "text" || input.type === "search") {
    return input.value.trim();
  }

  return input.value;
}

function normalizeInputDefaultValue(input: HTMLInputElement) {
  if (input.type === "checkbox" || input.type === "radio") {
    return input.defaultChecked ? "checked" : "unchecked";
  }

  if (input.type === "number") {
    const value = input.defaultValue.trim();
    return value.length > 0 && Number.isFinite(Number(value)) ? String(Number(value)) : value;
  }

  if (input.type === "text" || input.type === "search") {
    return input.defaultValue.trim();
  }

  return input.defaultValue;
}

function normalizeControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (control instanceof HTMLInputElement) {
    return normalizeInputValue(control);
  }

  if (control instanceof HTMLSelectElement && control.multiple) {
    return Array.from(control.selectedOptions)
      .map((option) => option.value)
      .join(",");
  }

  return control.value.trim();
}

function normalizeControlDefaultValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (control instanceof HTMLInputElement) {
    return normalizeInputDefaultValue(control);
  }

  if (control instanceof HTMLSelectElement) {
    return Array.from(control.options)
      .filter((option) => option.defaultSelected)
      .map((option) => option.value)
      .join(",");
  }

  return control.defaultValue.trim();
}

function shouldTrackControl(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (!control.name || control.disabled) {
    return false;
  }

  if (control instanceof HTMLInputElement) {
    return !["button", "hidden", "reset", "submit"].includes(control.type);
  }

  return true;
}

function getFormSnapshot(form: HTMLFormElement) {
  return Array.from(form.elements)
    .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
      return isSubmittableControl(element) && shouldTrackControl(element);
    })
    .map((control) => `${control.name}:${control.type}:${normalizeControlValue(control)}`)
    .join("\n");
}

function getFormDefaultSnapshot(form: HTMLFormElement) {
  return Array.from(form.elements)
    .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
      return isSubmittableControl(element) && shouldTrackControl(element);
    })
    .map((control) => `${control.name}:${control.type}:${normalizeControlDefaultValue(control)}`)
    .join("\n");
}

export function isFormDirty(form: HTMLFormElement) {
  return getFormSnapshot(form) !== getFormDefaultSnapshot(form);
}

export function hasDirtyForms() {
  return Array.from(document.querySelectorAll<HTMLFormElement>("form[data-dirty-watch]")).some(isFormDirty);
}

function subscribeToFormDirty(form: HTMLFormElement, onDirtyChange: (isDirty: boolean) => void) {
  const initialSnapshot = getFormSnapshot(form);

  function updateDirtyState() {
    onDirtyChange(getFormSnapshot(form) !== initialSnapshot);
  }

  function updateDirtyStateAfterReset() {
    window.requestAnimationFrame(updateDirtyState);
  }

  updateDirtyState();
  form.addEventListener("input", updateDirtyState);
  form.addEventListener("change", updateDirtyState);
  form.addEventListener("reset", updateDirtyStateAfterReset);

  return () => {
    form.removeEventListener("input", updateDirtyState);
    form.removeEventListener("change", updateDirtyState);
    form.removeEventListener("reset", updateDirtyStateAfterReset);
  };
}

export function useButtonFormDirty(buttonRef: RefObject<HTMLButtonElement | null>, disabled = false) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const form = buttonRef.current?.form;

    if (!form) {
      return;
    }

    return subscribeToFormDirty(form, setIsDirty);
  }, [buttonRef, disabled]);

  return isDirty;
}

export function useFormDirtyById(formId: string, disabled = false) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    return subscribeToFormDirty(form, setIsDirty);
  }, [disabled, formId]);

  return isDirty;
}
