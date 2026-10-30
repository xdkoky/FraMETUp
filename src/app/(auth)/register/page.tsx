import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="font-display text-4xl">Start your map</h1>
      <p className="mt-2 text-sm text-muted">Your reflections, feedback and progress are private by default.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
