import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[15px] leading-relaxed text-muted">
      <Link href="/">
        <Wordmark />
      </Link>
      <h1 className="mt-8 font-display text-5xl text-text">Privacy notice</h1>
      <p className="mt-2 text-xs text-faint">Template for the MVP — the operator must review it with their data protection officer before production use.</p>
      <h2 className="mt-8 text-lg font-semibold text-text">Who runs this</h2>
      <p>FraMETUp is an independent student development tool. It is not an official Budapest Metropolitan University (METU) system and does not access university records or grades.</p>
      <h2 className="mt-6 text-lg font-semibold text-text">What we store</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Account data: email, hashed password, display name, academic year.</li>
        <li>Your projects, evidence metadata and uploaded files, reflections, self-assessments, learning goals.</li>
        <li>Peer feedback you give and receive, and the skill estimates computed from your evidence.</li>
        <li>Security records: sessions and an audit log of sensitive actions.</li>
      </ul>
      <h2 className="mt-6 text-lg font-semibold text-text">Who can see it</h2>
      <p>Reflections, self-assessments, skill estimates and feedback are private to you. Feedback is visible only to you and its author (or anonymous if they chose). Projects are private unless you share them with collaborators or your cohort. Administrators manage the platform but the app does not give them access to your private development data.</p>
      <h2 className="mt-6 text-lg font-semibold text-text">AI processing</h2>
      <p>AI analysis is off by default. If you enable it, only the reflection text you explicitly send (with project title, type and the public skill catalogue) is sent to Anthropic&apos;s API. AI output is stored as suggestions you can accept or dismiss. AI results are never official grades.</p>
      <h2 className="mt-6 text-lg font-semibold text-text">Your rights</h2>
      <p>You can export all your data and permanently delete your account from Settings. Under the GDPR you may also request access, correction or restriction of processing from the operator.</p>
      <h2 className="mt-6 text-lg font-semibold text-text">Your creative work</h2>
      <p>Only upload material you have the right to store. Prefer private links for films. FraMETUp never publishes or redistributes your work.</p>
    </main>
  );
}
