import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to continue mapping your work.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-8 rounded-lg border border-amber/20 bg-amber-soft p-3 text-xs text-amber leading-relaxed">
        <strong className="font-semibold">Exploring?</strong> Sign in as the demonstration student
        <code className="mx-1 font-mono">demo@frametup.local</code> / <code className="font-mono">frametup-demo</code>. All demo data is fictional.
      </div>
    </>
  );
}
