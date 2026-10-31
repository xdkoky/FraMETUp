import { CREATIVE_ROLES, LIVE_ROLES, MANAGER_ROLES, TAKE_ROLES, roleInfo, type Department } from "./roles";

/**
 * Production permissions are scoped to one production: being a director here never grants
 * anything elsewhere. Pure functions over plain data so they can be tested exhaustively.
 */
export interface ProductionViewer {
  id: string;
  roles: string[]; // global roles: STUDENT / INSTRUCTOR / ADMIN
}

export interface MemberFacts {
  id: string;
  userId: string | null;
  roles: string[];
  isManager: boolean;
  isActor: boolean;
  status: "INVITED" | "ACCEPTED" | "DECLINED";
}

export interface ProductionFacts {
  createdById: string;
  deletedAt: Date | null;
  members: MemberFacts[];
}

export interface ProductionAccess {
  member: MemberFacts | null;
  view: boolean;
  /** Actor-only participants see their own scenes, call times and production contacts. */
  limited: boolean;
  manage: boolean;
  editCreative: boolean;
  liveUpdate: boolean;
  logTakes: boolean;
  seeContacts: boolean;
  readyDepartments: Department[];
  /** Instructors/admins see everything for teaching and support. */
  staffView: boolean;
}

const NONE: ProductionAccess = {
  member: null,
  view: false,
  limited: false,
  manage: false,
  editCreative: false,
  liveUpdate: false,
  logTakes: false,
  seeContacts: false,
  readyDepartments: [],
  staffView: false,
};

export function productionAccess(viewer: ProductionViewer, p: ProductionFacts): ProductionAccess {
  if (p.deletedAt) return NONE;
  const staff = viewer.roles.includes("INSTRUCTOR") || viewer.roles.includes("ADMIN");
  const admin = viewer.roles.includes("ADMIN");
  const m = p.members.find((x) => x.userId === viewer.id) ?? null;
  const accepted = m?.status === "ACCEPTED";
  const creator = viewer.id === p.createdById;
  const roles = accepted ? m!.roles : [];
  const manager = creator || admin || (accepted && (m!.isManager || roles.some((r) => MANAGER_ROLES.has(r))));
  const actorOnly = accepted && !manager && (m!.isActor || (roles.length > 0 && roles.every((r) => r === "actor")));
  const crew = accepted && !actorOnly;

  if (!creator && !accepted && !staff) {
    // Invited people can see the invitation, nothing more.
    return { ...NONE, member: m };
  }
  const readyDepartments: Department[] = manager
    ? ["camera", "lighting", "sound", "art", "cast"]
    : roles.filter((r) => roleInfo(r).lead).map((r) => roleInfo(r).department);
  if (roles.includes("first_ad") || roles.includes("second_ad")) readyDepartments.push("cast");

  return {
    member: m,
    view: true,
    limited: actorOnly && !staff,
    manage: manager,
    editCreative: manager || roles.some((r) => CREATIVE_ROLES.has(r)),
    liveUpdate: manager || roles.some((r) => LIVE_ROLES.has(r)),
    logTakes: manager || roles.some((r) => TAKE_ROLES.has(r)),
    seeContacts: manager || crew || staff,
    readyDepartments: [...new Set(readyDepartments)],
    staffView: staff && !accepted && !creator,
  };
}
