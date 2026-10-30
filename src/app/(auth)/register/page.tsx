import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Create account") };
}

export default async function RegisterPage() {
  const t = await getT();
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="font-display text-4xl">{t("Start your map")}</h1>
      <p className="mt-2 text-sm text-muted">{t("Your reflections, feedback and progress are private by default.")}</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="text-accent hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </>
  );
}
