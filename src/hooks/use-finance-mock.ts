"use client";

import { useEffect, useState } from "react";

import {
  defaultFinanceMovements,
  FINANCE_STORAGE_KEY,
  type FinanceMovement,
  parseFinanceMovements,
} from "@/lib/finance-mock";

function readFinanceMovements() {
  if (typeof window === "undefined") {
    return defaultFinanceMovements;
  }

  return parseFinanceMovements(window.localStorage.getItem(FINANCE_STORAGE_KEY));
}

function writeFinanceMovements(movements: FinanceMovement[]) {
  window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(movements));
  window.dispatchEvent(new CustomEvent("finance-mock-updated", { detail: movements }));
}

export function useFinanceMock() {
  const [movements, setMovements] = useState<FinanceMovement[]>(() => readFinanceMovements());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === FINANCE_STORAGE_KEY) {
        setMovements(parseFinanceMovements(event.newValue));
      }
    }

    function handleCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<FinanceMovement[]>;
      setMovements(customEvent.detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("finance-mock-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("finance-mock-updated", handleCustomEvent);
    };
  }, []);

  function updateMovements(
    updater: FinanceMovement[] | ((current: FinanceMovement[]) => FinanceMovement[]),
  ) {
    setMovements((current) => {
      const nextMovements = typeof updater === "function" ? updater(current) : updater;

      if (typeof window !== "undefined") {
        writeFinanceMovements(nextMovements);
      }

      return nextMovements;
    });
  }

  return { movements, updateMovements };
}

export function resetFinanceMock() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(defaultFinanceMovements));
  window.dispatchEvent(new CustomEvent("finance-mock-updated", { detail: defaultFinanceMovements }));
}
