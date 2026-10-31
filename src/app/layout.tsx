import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { getLocale, getT } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { getThemePref } from "@/lib/theme";
import { UiSounds } from "@/components/shell/ui-sounds";

const nunito = Nunito({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800", "900"], variable: "--font-nunito", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "FraMETUp", template: "%s · FraMETUp" },
    description: t("An evidence-based map of your development as a film director."),
    applicationName: "FraMETUp",
    appleWebApp: { capable: true, title: "FraMETUp", statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#121820" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = await getThemePref();
  return (
    <html lang={locale} className={`${nunito.variable} ${mono.variable}${theme === "auto" ? "" : ` ${theme}`}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <UiSounds />
        <I18nProvider locale={locale} dict={DICTIONARIES[locale]}>
          <div className="relative z-10">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
