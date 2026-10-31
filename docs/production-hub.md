# Production Hub & Virtual Viewfinder

## Where things live

| Area | Code |
| --- | --- |
| Data model | `prisma/schema.prisma` (Production, ProductionMember, Scene, Shot, ShotReference, CameraProfile, PhoneCalibration, CallSheetVersion, CallSheetAcknowledgement, ProductionTask, DepartmentReadiness, TakeLog, ProductionDocument(+Version), ProductionAnnouncement, ProductionChange, ProductionComment, WrapReport, ProductionReflection) |
| Pure domain logic (tested) | `src/lib/production/*` — roles, permissions, optics, cameras, rotation, schedule, call sheets, lifecycle |
| Server access + change log | `src/lib/services/production.ts` |
| Server actions | `src/app/(app)/production/actions.ts`, `src/app/(app)/viewfinder/actions.ts` |
| Screens | `src/app/(app)/production/**`, `src/app/(app)/viewfinder/**`, printable docs in `src/app/production-print/**` |
| Files | `src/app/api/production-files/[kind]/[id]` (references, take photos, documents — never public URLs) |
| Live sync | `src/app/api/productions/[id]/pulse` + `src/components/production/live-pulse.tsx` |

## Permissions

Production permissions are **scoped to one production** (`productionAccess` in `src/lib/production/permissions.ts`): the creator,
admins, members flagged as managers and directors/producers/1st ADs manage; creative roles edit briefs and shot lists; AD/camera
roles move shots on the Live Set; department leads mark readiness; actors see only the overview and their call sheet; contacts
are hidden from actors; instructors can observe every production read-only. Invitations show nothing until accepted. Every server
action re-checks access; unauthorised requests get "not found".

## Learning integration

Wrapping a production awards participation XP (`PRODUCTION_WRAPPED`) — activity, never mastery. Each crew member can write a
role-specific reflection and optionally add the production to their portfolio: a project is created and the role's skills
(`ROLE_SKILLS`) are linked **as practice with no rubric level**, so the existing hybrid assessment (self-mapping, peer and
instructor feedback) decides any progression. Role history on wrapped productions powers the rotation overview and suggestions.

## Virtual Viewfinder

* Framing uses the rectilinear relation `FOV = 2·atan(d / 2f)` separately for width and height of the selected sensor mode.
* The phone's own field of view is **not available from browser APIs**. Users calibrate each phone camera (A4 sheet + distance, or
  a known FOV); uncalibrated previews assume a typical 26 mm-equivalent main camera and are always labelled *approximate*.
* Narrower lenses are simulated by cropping (with a warning when the effective resolution drops); lenses wider than the phone
  camera are reported as a limitation instead of being faked.
* Bundled camera modes come only from manufacturer documentation (sources linked in `cameras.ts`). They are examples, not the
  studio inventory; anything else can be added as a custom profile (instructors can share profiles with everyone).
* Requires HTTPS (or localhost). `Permissions-Policy` allows `camera=(self)`. The stream is stopped when the page is hidden.
* Not simulated: depth of field, bokeh, breathing, distortion, anamorphic squeeze, colour science, dynamic range.

## Known limitations / future work

* **Live sync** is a 5-second poll of a tiny endpoint (no websockets on serverless). It shows an offline indicator; changes are
  saved by the server action that made them, never queued silently.
* **Offline**: not implemented yet. A service worker could cache the latest published call sheet and personal schedule.
* **PDF**: call sheets and take reports are print-optimised pages saved with the browser's "Save as PDF".
* **Change-log lines** (Live Set "Latest updates") are stored in English.
* **Native app** ideas: reading real camera intrinsics (iOS AVFoundation / Android Camera2) to remove manual calibration,
  automatic switching between phone lenses, and lens-distortion preview.
