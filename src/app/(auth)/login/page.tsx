import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Sign in") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getT();
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-[2.1rem]">{t("Welcome back")}</h1>
      <p className="mt-2 text-sm text-muted">{t("Sign in to continue mapping your work.")}</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted">
        {t("New here?")}{" "}
        <Link href="/register" className="text-accent hover:underline">
          {t("Create an account")}
        </Link>
      </p>
      <div className="mt-8 rounded-lg border border-amber/20 bg-amber-soft p-3 text-xs text-amber leading-relaxed">
        <strong className="font-semibold">{t("Exploring?")}</strong>{" "}{t("Sign in as the demonstration student")}
        <code className="mx-1 font-mono">demo@frametup.local</code> / <code className="font-mono">frametup-demo</code>{t(". All demo data is fictional.")}
      </div>
    </>
  );
}
