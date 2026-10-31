import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { getLocale, getT } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { DICTIONARIES } from "@/i18n/dictionaries";

const nunito = Nunito({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800", "900"], variable: "--font-nunito", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "FraMETUp", template: "%s · FraMETUp" },
    description: t("An evidence-based map of your development as a film director."),
  };
}

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${nunito.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} dict={DICTIONARIES[locale]}>
          <div className="relative z-10">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
