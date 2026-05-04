"use client";

import { resetAppointmentsMock } from "@/hooks/use-appointments-mock";
import { resetCmsContent } from "@/hooks/use-cms-content";
import { resetFinanceMock } from "@/hooks/use-finance-mock";

export function AdminDemoActions() {
  function resetDemo() {
    resetCmsContent();
    resetAppointmentsMock();
    resetFinanceMock();
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[rgba(145,145,140,0.35)] bg-white px-5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
      type="button"
      onClick={resetDemo}
    >
      Reset demo
    </button>
  );
}
