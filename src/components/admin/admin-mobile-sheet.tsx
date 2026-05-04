"use client";

import { useEffect } from "react";

type AdminMobileSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function AdminMobileSheet({ open, onClose, children }: AdminMobileSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/45"
        type="button"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[calc(100vh-2rem)] overflow-hidden rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-0 lg:bottom-auto lg:mx-auto lg:my-auto lg:max-h-[calc(100vh-4rem)] lg:max-w-lg lg:rounded-[2rem]">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-[var(--secondary-btn)] lg:hidden" />
        <div className="max-h-[calc(100vh-3rem)] overflow-y-auto p-4 pb-8 lg:max-h-[calc(100vh-4rem)] lg:px-5 lg:py-5">{children}</div>
      </div>
    </div>
  );
}
