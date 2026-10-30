import {
  Activity,
  Clapperboard,
  Dna,
  GitBranch,
  LayoutDashboard,
  MessagesSquare,
  Settings2,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";

/** The everyday places — also the phone tab bar. */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/skills", label: "Skill Tree", short: "Tree", icon: GitBranch },
  { href: "/projects", label: "Projects", short: "Projects", icon: Clapperboard },
  { href: "/feedback", label: "Feedback", short: "Feedback", icon: MessagesSquare },
] as const;

/** Reflection and planning tools, grouped under "Growth". */
export const GROWTH_NAV = [
  { href: "/challenges", label: "Challenges", icon: Target },
  { href: "/dna", label: "Director DNA", icon: Dna },
  { href: "/timeline", label: "Timeline", icon: Activity },
] as const;

export const SECONDARY_NAV = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings & privacy", icon: Settings2 },
  { href: "/admin/taxonomy", label: "Taxonomy admin", icon: Wrench, adminOnly: true },
] as const;
