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

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/skills", label: "Skill Tree", icon: GitBranch },
  { href: "/projects", label: "Projects", icon: Clapperboard },
  { href: "/dna", label: "Director DNA", icon: Dna },
  { href: "/challenges", label: "Challenges", icon: Target },
  { href: "/feedback", label: "Feedback", icon: MessagesSquare },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export const SECONDARY_NAV = [
  { href: "/settings", label: "Settings & privacy", icon: Settings2 },
  { href: "/admin/taxonomy", label: "Taxonomy admin", icon: Wrench, adminOnly: true },
] as const;
