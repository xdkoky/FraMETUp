import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { externalAIConfigured } from "@/lib/ai";
import { Page } from "@/components/shell/page";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { DeleteAccountForm, PasswordForm, PrivacyForm } from "./forms";

export const metadata: Metadata = { title: "Settings & privacy" };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings =
    (await db.privacySettings.findUnique({ where: { userId: user.id } })) ?? (await db.privacySettings.create({ data: { userId: user.id } }));
  return (
    <Page className="max-w-3xl">
      <PageHeader eyebrow="Settings" title="Privacy & data" description="Your reflections, feedback and skill estimates are private by default. You decide what to share." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Privacy" />
          <div className="p-5">
            <PrivacyForm settings={settings} externalAI={externalAIConfigured()} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Your data" />
          <div className="p-5 space-y-3 text-sm text-muted">
            <p>Download everything DIRECTOR OS stores about you as JSON (GDPR data portability).</p>
            <a href="/api/export" className={buttonClass("secondary", "sm")}>
              <Download className="size-4" aria-hidden /> Export my data
            </a>
            <p className="text-xs text-faint">
              Read the <Link href="/privacy" className="text-accent hover:underline">privacy notice</Link> for what is stored and why.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Password" />
          <div className="p-5">
            <PasswordForm />
          </div>
        </Card>
        <Card className="border-danger/25">
          <CardHeader title="Delete account" />
          <div className="p-5">
            {user.isDemo ? <p className="text-sm text-faint">Demo accounts can&apos;t be deleted here — re-run the seed to reset them.</p> : <DeleteAccountForm />}
          </div>
        </Card>
      </div>
    </Page>
  );
}
