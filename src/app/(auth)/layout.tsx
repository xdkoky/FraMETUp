import Link from "next/link";
import { getT } from "@/i18n/server";
import { LocaleSwitch } from "@/i18n/locale-switch";
import { Wordmark } from "@/components/brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-line-soft">
        <AuthArt />
        <Link href="/" className="relative">
          <Wordmark className="text-[15px]" />
        </Link>
        <div className="relative max-w-md">
          <div className="slate-label mb-4">{t("Scene 01 · Take 01")}</div>
          <p className="font-display text-5xl leading-[1.05]">{t("A map of how you are becoming a director.")}</p>
          <p className="mt-5 text-muted leading-relaxed">
            {t("Document your projects, gather honest feedback, and watch your skills connect over the years — backed by evidence, not arbitrary scores.")}
          </p>
        </div>
        <p className="relative text-xs text-faint">{t("An independent student tool for METU film directing students. Not an official university system.")}</p>
      </section>
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <LocaleSwitch className="absolute right-6 top-6" />
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

function AuthArt() {
  // Decorative constellation hinting at the skill tree.
  const pts = [
    [120, 140], [260, 90], [380, 180], [200, 260], [330, 320], [470, 260], [150, 400], [290, 450], [430, 420], [540, 360], [560, 150],
  ];
  const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 5], [4, 5], [3, 6], [6, 7], [4, 7], [7, 8], [5, 9], [8, 9], [2, 10], [5, 10]];
  return (
    <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 640 560" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {edges.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="#2A3142" strokeWidth="1" />
      ))}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i % 4 === 0 ? 9 : 6} fill="#0B0D12" stroke={i % 5 === 0 ? "#E8B04B" : i % 2 ? "#6E9BFF" : "#4A5263"} strokeWidth="1.5" strokeDasharray={i % 3 === 2 ? "3 3" : undefined} />
        </g>
      ))}
    </svg>
  );
}
