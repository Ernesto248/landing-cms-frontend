"use client";

import { useEffect, useState } from "react";

import {
  APPOINTMENTS_STORAGE_KEY,
  defaultAppointments,
  parseAppointments,
  type AppointmentRecord,
} from "@/lib/appointments-mock";

function readAppointments() {
  if (typeof window === "undefined") {
    return defaultAppointments;
  }

  return parseAppointments(window.localStorage.getItem(APPOINTMENTS_STORAGE_KEY));
}

function writeAppointments(appointments: AppointmentRecord[]) {
  window.localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  window.dispatchEvent(new CustomEvent("appointments-mock-updated", { detail: appointments }));
}

export function useAppointmentsMock() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(() => readAppointments());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === APPOINTMENTS_STORAGE_KEY) {
        setAppointments(parseAppointments(event.newValue));
      }
    }

    function handleCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<AppointmentRecord[]>;
      setAppointments(customEvent.detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("appointments-mock-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("appointments-mock-updated", handleCustomEvent);
    };
  }, []);

  function updateAppointments(
    updater: AppointmentRecord[] | ((current: AppointmentRecord[]) => AppointmentRecord[]),
  ) {
    setAppointments((current) => {
      const nextAppointments = typeof updater === "function" ? updater(current) : updater;

      if (typeof window !== "undefined") {
        writeAppointments(nextAppointments);
      }

      return nextAppointments;
    });
  }

  return { appointments, updateAppointments };
}

export function resetAppointmentsMock() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(defaultAppointments));
  window.dispatchEvent(
    new CustomEvent("appointments-mock-updated", { detail: defaultAppointments }),
  );
}
