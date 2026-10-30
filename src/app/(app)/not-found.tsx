import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="px-6 py-24 text-center">
      <div className="slate-label">Scene missing</div>
      <h1 className="mt-2 font-display text-4xl">We couldn&apos;t find that.</h1>
      <p className="mt-2 text-muted">It may not exist, or you may not have permission to see it.</p>
      <LinkButton href="/dashboard" variant="secondary" className="mt-6">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
