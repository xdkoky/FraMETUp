import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "FraMETUp", template: "%s · FraMETUp" },
  description: "An evidence-based map of your development as a film director.",
};

export const viewport: Viewport = { themeColor: "#0B0D12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
