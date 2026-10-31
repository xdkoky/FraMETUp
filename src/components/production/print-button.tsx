"use client";

import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="no-print rounded-lg border-2 border-black px-4 py-2 font-bold">
      {t("Print / Save as PDF")}
    </button>
  );
}
