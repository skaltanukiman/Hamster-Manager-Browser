"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { shouldShowSettingsScrollButton } from "@/components/settings-layout";

const SAVE_TARGET_ID = "dashboard-settings-save";

export function SettingsScrollToSaveButton() {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = document.getElementById(SAVE_TARGET_ID);
    if (!target) return;

    const updateFromTargetPosition = () => {
      const targetRect = target.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const isIntersecting = targetRect.bottom > 0 && targetRect.top < viewportBottom;
      setIsVisible(
        shouldShowSettingsScrollButton({
          isIntersecting,
          targetTop: targetRect.top,
          viewportBottom
        })
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      const viewportBottom = entry.rootBounds?.bottom ?? window.innerHeight;
      setIsVisible(
        shouldShowSettingsScrollButton({
          isIntersecting: entry.isIntersecting,
          targetTop: entry.boundingClientRect.top,
          viewportBottom
        })
      );
    });

    updateFromTargetPosition();
    observer.observe(target);
    window.addEventListener("scroll", updateFromTargetPosition, { passive: true });
    window.addEventListener("resize", updateFromTargetPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateFromTargetPosition);
      window.removeEventListener("resize", updateFromTargetPosition);
    };
  }, []);

  useEffect(() => {
    if (!isVisible && buttonRef.current === document.activeElement) {
      document.getElementById(SAVE_TARGET_ID)?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    }
  }, [isVisible]);

  function scrollToSaveButton() {
    document.getElementById(SAVE_TARGET_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={scrollToSaveButton}
      aria-label="保存ボタンまでスクロール"
      title="保存ボタンまでスクロール"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      className={`fixed bottom-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-md bg-[#999999] text-white shadow-lg shadow-slate-400/50 transition hover:bg-[#7f7f7f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:bottom-5 sm:right-5 sm:h-12 sm:w-12 xl:bottom-8 xl:right-8 xl:h-14 xl:w-14 ${
        isVisible ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
    >
      <ChevronDown className="h-7 w-7 stroke-[3] sm:h-8 sm:w-8 xl:h-9 xl:w-9" aria-hidden />
    </button>
  );
}
