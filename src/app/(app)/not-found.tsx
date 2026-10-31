import { getT } from "@/i18n/server";
import { LinkButton } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="px-6 py-24 text-center">
      <div className="slate-label">{t("Scene missing")}</div>
      <h1 className="mt-2 font-display text-[2.1rem]">{t("We couldn't find that.")}</h1>
      <p className="mt-2 text-muted">{t("It may not exist, or you may not have permission to see it.")}</p>
      <LinkButton href="/dashboard" variant="secondary" className="mt-6">
        {t("Back to dashboard")}
      </LinkButton>
    </div>
  );
}
