"use client";

import { useEffect, useState } from "react";

import {
  CMS_CONTENT_STORAGE_KEY,
  type CmsContent,
  defaultCmsContent,
  normalizeCmsContent,
  parseCmsContent,
} from "@/lib/cms-content";

function readCmsContentFromStorage() {
  if (typeof window === "undefined") {
    return defaultCmsContent;
  }

  return parseCmsContent(window.localStorage.getItem(CMS_CONTENT_STORAGE_KEY));
}

function writeCmsContentToStorage(content: CmsContent) {
  window.localStorage.setItem(CMS_CONTENT_STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new CustomEvent("cms-content-updated", { detail: content }));
}

export function useCmsContent() {
  const [content, setContent] = useState<CmsContent>(() => readCmsContentFromStorage());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === CMS_CONTENT_STORAGE_KEY) {
        setContent(parseCmsContent(event.newValue));
      }
    }

    function handleCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<CmsContent>;
      setContent(normalizeCmsContent(customEvent.detail));
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cms-content-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cms-content-updated", handleCustomEvent);
    };
  }, []);

  function updateContent(updater: CmsContent | ((current: CmsContent) => CmsContent)) {
    setContent((current) => {
      const nextContent = normalizeCmsContent(
        typeof updater === "function" ? updater(current) : updater,
      );

      if (typeof window !== "undefined") {
        writeCmsContentToStorage(nextContent);
      }

      return nextContent;
    });
  }

  return { content, updateContent };
}

export function resetCmsContent() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CMS_CONTENT_STORAGE_KEY, JSON.stringify(defaultCmsContent));
  window.dispatchEvent(new CustomEvent("cms-content-updated", { detail: defaultCmsContent }));
}
