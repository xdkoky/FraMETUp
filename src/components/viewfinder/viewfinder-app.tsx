"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CameraOff, Download, Maximize2, Minimize2, RefreshCw, Ruler, Save, Settings2, SwitchCamera, X } from "lucide-react";
import { ASPECT_PRESETS, computeFraming, FOCAL_PRESETS, frameWithin, parseAspect, UNCALIBRATED_LONG_SIDE_FOV } from "@/lib/production/optics";
import type { CameraProfileDef } from "@/lib/production/cameras";
import { saveReference } from "@/app/(app)/production/actions";
import { saveCalibration } from "@/app/(app)/viewfinder/actions";
import { buttonClass } from "@/components/ui/button";
import { field, labelCls } from "@/components/production/styles";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface ProductionOpt {
  id: string;
  title: string;
  scenes: { id: string; label: string; shots: { id: string; label: string }[] }[];
}

type CamState = "idle" | "starting" | "live" | "denied" | "unavailable" | "insecure" | "error";

const PREF_KEY = "frametup:viewfinder";

function loadPrefs(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function ViewfinderApp({
  cameras,
  calibrations,
  productions,
  initial,
}: {
  cameras: CameraProfileDef[];
  calibrations: { id: string; label: string; fov: number }[];
  productions: ProductionOpt[];
  initial: { productionId: string; sceneId: string; shotId: string; focal: number | null };
}) {
  const t = useT();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camState, setCamState] = useState<CamState>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceLabel, setDeviceLabel] = useState<string>("");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState<{ w: number; h: number }>({ w: 360, h: 240 });

  const [cameraId, setCameraId] = useState(cameras[0]?.id ?? "");
  const [modeKey, setModeKey] = useState(cameras[0]?.modes[0]?.key ?? "");
  const [focal, setFocal] = useState<number>(initial.focal ?? 35);
  const [aspectLabel, setAspectLabel] = useState<string>("Sensor");
  const [customAspect, setCustomAspect] = useState("2:1");
  const [overlays, setOverlays] = useState({ thirds: true, center: false, safe: false });
  const [immersive, setImmersive] = useState(false);
  const [panel, setPanel] = useState<"none" | "calibrate" | "save">("none");
  const [capture, setCapture] = useState<{ url: string; blob: Blob } | null>(null);
  const [calibrationId, setCalibrationId] = useState<string>("");

  // Remember the last camera/lens setup on this device.
  useEffect(() => {
    const p = loadPrefs();
    if (typeof p.cameraId === "string" && cameras.some((c) => c.id === p.cameraId)) setCameraId(p.cameraId);
    if (typeof p.modeKey === "string") setModeKey(p.modeKey);
    if (!initial.focal && typeof p.focal === "number") setFocal(p.focal);
    if (typeof p.aspectLabel === "string") setAspectLabel(p.aspectLabel);
    if (typeof p.calibrationId === "string") setCalibrationId(p.calibrationId);
  }, [cameras, initial.focal]);
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ cameraId, modeKey, focal, aspectLabel, calibrationId }));
    } catch {}
  }, [cameraId, modeKey, focal, aspectLabel, calibrationId]);

  const cam = cameras.find((c) => c.id === cameraId) ?? cameras[0];
  const mode = cam?.modes.find((m) => m.key === modeKey) ?? cam?.modes[0];
  const aspect = aspectLabel === "Custom" ? parseAspect(customAspect) : (ASPECT_PRESETS.find((a) => a.label === aspectLabel)?.value ?? null);

  // A calibration matching the active phone camera by name, or one the user picked.
  const calibration = calibrations.find((c) => c.id === calibrationId) ?? calibrations.find((c) => deviceLabel && c.label === deviceLabel) ?? null;
  const phoneFov = calibration?.fov ?? UNCALIBRATED_LONG_SIDE_FOV;

  const framing = useMemo(() => {
    if (!dims || !mode || !(focal > 0)) return null;
    return computeFraming({ phoneLongSideFovDeg: phoneFov, streamWidth: dims.w, streamHeight: dims.h, frame: { widthMm: mode.widthMm, heightMm: mode.heightMm }, focalMm: focal });
  }, [dims, mode, focal, phoneFov]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (id?: string) => {
      if (typeof window !== "undefined" && !window.isSecureContext) return setCamState("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setCamState("unavailable");
      setCamState("starting");
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: id ? { deviceId: { exact: id }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        setDeviceLabel(track?.label ?? "");
        setDeviceId(track?.getSettings().deviceId ?? id ?? "");
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === "videoinput"));
        setCamState("live");
      } catch (e) {
        const name = (e as { name?: string }).name;
        setCamState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "unavailable" : "error");
      }
    },
    [stopStream],
  );

  // Free the camera when the page is hidden (iOS kills it anyway) and resume when back.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stopStream();
        if (camState === "live") setCamState("idle");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [camState, stopStream]);
  useEffect(() => () => stopStream(), [stopStream]);

  // Track the stream's real size (it can change when the phone rotates).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => v.videoWidth && setDims({ w: v.videoWidth, h: v.videoHeight });
    v.addEventListener("loadedmetadata", update);
    v.addEventListener("resize", update);
    return () => {
      v.removeEventListener("loadedmetadata", update);
      v.removeEventListener("resize", update);
    };
  }, []);

  // Track the stage size for layout.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [immersive]);

  // Frame box: the cinema sensor area, fitted inside the stage.
  const frameAspect = framing?.frameAspect ?? (mode ? mode.widthMm / mode.heightMm : 1.5);
  const box = (() => {
    const pad = immersive ? 0 : 0;
    const w = Math.min(stage.w - pad, (stage.h - pad) * frameAspect);
    return { w, h: w / frameAspect };
  })();
  const video = framing && dims ? { w: box.w * framing.scale, h: box.w * framing.scale * (dims.h / dims.w) } : null;
  const tooWide = framing ? !framing.fitsH : false;
  const tooTall = framing ? framing.fitsH && !framing.fitsV : false;
  const soft = framing ? framing.fitsH && framing.effectivePixels < 600 : false;

  // Aspect-ratio mask inside the sensor area.
  const inner = aspect ? frameWithin({ widthMm: box.w, heightMm: box.h }, aspect) : { widthMm: box.w, heightMm: box.h };

  const toggleImmersive = async () => {
    const next = !immersive;
    setImmersive(next);
    try {
      if (next && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if (!next && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* iOS Safari: no Fullscreen API for pages — the CSS full-screen mode still works. */
    }
  };

  const doCapture = async () => {
    const v = videoRef.current;
    if (!v || !dims || !framing || tooWide) return;
    // The visible region in stream pixels: the frame box, minus the aspect mask.
    const srcW = (dims.w / framing.scale) * (inner.widthMm / box.w);
    const srcH = Math.min(dims.h, (dims.w / framing.scale / frameAspect) * (inner.heightMm / box.h));
    const sx = (dims.w - srcW) / 2;
    const sy = (dims.h - srcH) / 2;
    const outW = Math.round(Math.min(srcW, 1920));
    const outH = Math.round(outW * (srcH / srcW));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext("2d")!.drawImage(v, sx, sy, srcW, srcH, 0, 0, outW, outH);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob) return;
    if (capture) URL.revokeObjectURL(capture.url);
    setCapture({ url: URL.createObjectURL(blob), blob });
    setPanel("save");
  };

  const aspectText = aspectLabel === "Custom" ? customAspect : aspectLabel === "Sensor" ? "" : aspectLabel;
  const cameraText = cam ? `${cam.manufacturer} ${cam.model}` : "";

  return (
    <div className={cn(immersive ? "fixed inset-0 z-[60] flex flex-col bg-black" : "mx-auto w-full max-w-5xl px-5 py-6 sm:px-7 lg:px-10")}>
      {!immersive && (
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="slate-label mb-1">{t("Production Hub")}</div>
            <h1 className="font-display text-[2rem] font-black leading-tight">{t("Virtual Viewfinder")}</h1>
            <p className="text-[14px] font-semibold text-muted">{t("Preview how a cinema camera and lens would frame the scene — through your phone.")}</p>
          </div>
          <Link href="/viewfinder/cameras" className={buttonClass("ghost", "sm")}>
            <Settings2 className="size-4" aria-hidden /> {t("Camera profiles")}
          </Link>
        </header>
      )}

      {/* ── Live preview ── */}
      <div ref={stageRef} data-no-swipe className={cn("relative flex items-center justify-center overflow-hidden bg-black", immersive ? "min-h-0 flex-1" : "aspect-video w-full rounded-2xl border-2 border-line")}>
        <video ref={videoRef} playsInline muted autoPlay className={cn("absolute", camState === "live" && framing && !tooWide ? "opacity-100" : "opacity-0")} style={video ? { width: video.w, height: video.h, left: "50%", top: "50%", transform: "translate(-50%, -50%)", maxWidth: "none" } : undefined} />

        {camState === "live" && framing && !tooWide && (
          <div className="pointer-events-none absolute" style={{ width: box.w, height: box.h }}>
            {/* outside the sensor area */}
            <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.78)]" />
            {/* aspect mask */}
            {aspect && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] outline outline-1 outline-white/80" style={{ width: inner.widthMm, height: inner.heightMm }}>
                <Guides overlays={overlays} />
              </div>
            )}
            {!aspect && <Guides overlays={overlays} />}
            <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
              {focal} mm · {Math.round(framing.targetH)}°×{Math.round(framing.targetV)}° {aspectText && `· ${aspectText}`}
            </div>
            {!calibration && <div className="absolute right-2 top-2 rounded-md bg-amber-bright/90 px-2 py-0.5 text-[11px] font-extrabold text-black">≈ {t("Approximate")}</div>}
          </div>
        )}

        {camState !== "live" && (
          <div className="relative z-10 flex max-w-sm flex-col items-center gap-3 p-6 text-center text-white">
            {camState === "starting" ? (
              <RefreshCw className="size-8 animate-spin" aria-hidden />
            ) : camState === "idle" ? (
              <Camera className="size-10" aria-hidden />
            ) : (
              <CameraOff className="size-10 text-danger" aria-hidden />
            )}
            <p className="text-[14px] font-semibold">
              {camState === "idle" && t("Allow camera access to start the viewfinder. Nothing is recorded or uploaded until you save a frame.")}
              {camState === "starting" && t("Starting camera…")}
              {camState === "denied" && t("Camera access was blocked. Allow it in your browser's site settings (on iPhone: Settings → Safari → Camera), then try again.")}
              {camState === "unavailable" && t("No usable camera was found on this device.")}
              {camState === "insecure" && t("The camera only works over a secure (https) connection.")}
              {camState === "error" && t("The camera couldn't start. Close other apps using it and try again.")}
            </p>
            {camState !== "starting" && camState !== "insecure" && camState !== "unavailable" && (
              <button type="button" onClick={() => start(deviceId || undefined)} className={buttonClass("primary", "md")}>
                {camState === "idle" ? t("Start camera") : t("Try again")}
              </button>
            )}
          </div>
        )}

        {camState === "live" && tooWide && framing && (
          <div className="relative z-10 max-w-md p-6 text-center text-white">
            <AlertTriangle className="mx-auto size-8 text-amber-bright" aria-hidden />
            <p className="mt-2 text-[15px] font-extrabold">{t("{mm} mm is wider than this phone camera can see.", { mm: focal })}</p>
            <p className="mt-1 text-[13px] font-semibold opacity-80">{t("The lens needs {a}° across; this camera sees about {b}°. Switch to the ultra-wide camera (and calibrate it) or turn the phone to landscape.", { a: Math.round(framing.targetH), b: Math.round(framing.phoneH) })}</p>
          </div>
        )}

        {immersive && (
          <button type="button" onClick={toggleImmersive} className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white" aria-label={t("Exit full screen")}>
            <Minimize2 className="size-5" />
          </button>
        )}
      </div>

      {/* Warnings */}
      {camState === "live" && framing && !tooWide && (tooTall || soft || !calibration) && (
        <div className={cn("space-y-1 text-[12.5px] font-bold", immersive ? "bg-black px-3 py-1 text-amber-bright" : "mt-2 text-amber")}>
          {tooTall && <p>{t("The top and bottom of this frame are outside the phone's view — turn the phone to landscape.")}</p>}
          {soft && <p>{t("Heavy digital crop: only about {px} phone pixels across, so the preview looks soft. Framing is still correct.", { px: framing.effectivePixels })}</p>}
          {!calibration && !immersive && (
            <p>
              {t("Approximate framing: this phone camera isn't calibrated yet.")}{" "}
              <button type="button" className="underline" onClick={() => setPanel("calibrate")}>
                {t("Calibrate in 1 minute")}
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div className={cn(immersive ? "space-y-2 bg-black px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2" : "mt-4 space-y-4")}>
        <div data-no-swipe className="relative -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={t("Focal length")}>
          {FOCAL_PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={focal === f}
              onClick={() => setFocal(f)}
              className={cn("press shrink-0 rounded-xl border-2 px-3 py-2 font-mono text-[14px] font-black", focal === f ? "border-accent bg-accent text-white shadow-[0_3px_0_var(--color-accent-strong)]" : immersive ? "border-white/30 text-white" : "border-line bg-surface text-text shadow-[0_3px_0_var(--color-line)]")}
            >
              {f}
            </button>
          ))}
          <label className={cn("flex shrink-0 items-center gap-1 rounded-xl border-2 px-2", immersive ? "border-white/30 text-white" : "border-line")}>
            <span className="sr-only">{t("Custom focal length")}</span>
            <input type="number" min={4} max={1200} step={1} value={focal} onChange={(e) => setFocal(Math.max(1, Number(e.target.value) || 1))} className="w-14 bg-transparent py-2 text-center font-mono text-[14px] font-black outline-none" />
            <span className="text-[12px] font-bold">mm</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {camState === "live" && (
            <button type="button" onClick={doCapture} disabled={tooWide} className={buttonClass("primary", "lg")}>
              <Camera className="size-5" aria-hidden /> {t("Capture frame")}
            </button>
          )}
          {!immersive && (
            <button type="button" onClick={toggleImmersive} className={buttonClass("secondary", "md")}>
              <Maximize2 className="size-4" aria-hidden /> {t("Full screen")}
            </button>
          )}
          {devices.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const i = devices.findIndex((d) => d.deviceId === deviceId);
                const nextDev = devices[(i + 1) % devices.length];
                start(nextDev.deviceId);
              }}
              className={buttonClass(immersive ? "ghost" : "secondary", "md")}
            >
              <SwitchCamera className="size-4" aria-hidden /> {t("Switch camera")}
            </button>
          )}
          {!immersive && (
            <button type="button" onClick={() => setPanel(panel === "calibrate" ? "none" : "calibrate")} className={buttonClass("ghost", "md")}>
              <Ruler className="size-4" aria-hidden /> {calibration ? t("Calibrated") : t("Calibrate")}
            </button>
          )}
        </div>

        {!immersive && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelCls}>
              {t("Camera")}
              <select
                value={cameraId}
                onChange={(e) => {
                  setCameraId(e.target.value);
                  setModeKey(cameras.find((c) => c.id === e.target.value)?.modes[0]?.key ?? "");
                }}
                className={`${field} mt-1`}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.manufacturer} {c.model}
                    {c.custom ? ` (${t("custom")})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("Sensor mode")}
              <select value={mode?.key} onChange={(e) => setModeKey(e.target.value)} className={`${field} mt-1`}>
                {cam?.modes.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} · {m.widthMm} × {m.heightMm} mm
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("Aspect ratio")}
              <select value={aspectLabel} onChange={(e) => setAspectLabel(e.target.value)} className={`${field} mt-1`}>
                {ASPECT_PRESETS.map((a) => (
                  <option key={a.label} value={a.label}>
                    {a.label === "Sensor" ? t("Full sensor area") : a.label}
                  </option>
                ))}
                <option value="Custom">{t("Custom…")}</option>
              </select>
              {aspectLabel === "Custom" && <input value={customAspect} onChange={(e) => setCustomAspect(e.target.value)} placeholder="2:1" className={`${field} mt-1`} aria-label={t("Custom aspect ratio")} />}
            </label>
            <fieldset className={labelCls}>
              <legend>{t("Guides")}</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  [
                    ["thirds", "Thirds"],
                    ["center", "Centre"],
                    ["safe", "Safe areas"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={overlays[k]} onClick={() => setOverlays({ ...overlays, [k]: !overlays[k] })} className={cn("rounded-xl border-2 px-2.5 py-1.5 text-[12.5px] font-bold", overlays[k] ? "border-accent bg-accent-soft text-accent" : "border-line text-muted")}>
                    {t(l)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {!immersive && mode && framing && (
          <p className="text-[12.5px] font-semibold text-muted">
            {t("Field of view: {h}° horizontal × {v}° vertical on {w} × {hh} mm.", { h: framing.targetH.toFixed(1), v: framing.targetV.toFixed(1), w: mode.widthMm, hh: mode.heightMm })}{" "}
            {t("Phone camera: {p}° across the long side ({s}).", { p: phoneFov.toFixed(1), s: calibration ? t("calibrated") : t("typical value, not measured") })}
          </p>
        )}

        {panel === "calibrate" && !immersive && <CalibratePanel deviceLabel={deviceLabel} calibrations={calibrations} selectedId={calibration?.id ?? ""} onSelect={setCalibrationId} onSaved={() => router.refresh()} onClose={() => setPanel("none")} />}

        {panel === "save" && capture && !immersive && (
          <SavePanel
            capture={capture}
            productions={productions}
            initial={initial}
            meta={{ focal, cameraText, sensorText: mode ? mode.name : "", sensorW: mode?.widthMm ?? 0, sensorH: mode?.heightMm ?? 0, aspect: aspectText, calibrated: Boolean(calibration), phoneFov }}
            onClose={() => setPanel("none")}
          />
        )}
        {panel === "save" && capture && immersive && (
          <div className="flex items-center gap-2 text-[13px] font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capture.url} alt="" className="h-12 rounded" />
            {t("Frame captured — exit full screen to save it.")}
          </div>
        )}

        {!immersive && (
          <details className="rounded-2xl border-2 border-line p-4 text-[13px] font-semibold text-muted">
            <summary className="cursor-pointer font-extrabold text-text">{t("What the viewfinder can and can't show")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("It shows field of view and framing for the chosen sensor area and focal length, using FOV = 2·atan(sensor size ÷ 2·focal length).")}</li>
              <li>{t("Accuracy depends on calibrating your phone camera. Uncalibrated framing is marked as approximate.")}</li>
              <li>{t("Longer lenses are simulated by cropping, so the preview gets softer. Lenses wider than the phone camera can't be shown.")}</li>
              <li>{t("It does not reproduce depth of field, bokeh, lens breathing, distortion, anamorphic squeeze, colour science or dynamic range.")}</li>
              <li>{t("Browsers don't expose the phone's optical data, so the app can't read the field of view automatically.")}</li>
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function Guides({ overlays }: { overlays: { thirds: boolean; center: boolean; safe: boolean } }) {
  return (
    <>
      {overlays.thirds && (
        <div className="absolute inset-0">
          {[1, 2].map((i) => (
            <span key={`v${i}`} className="absolute inset-y-0 w-px bg-white/45" style={{ left: `${(i * 100) / 3}%` }} />
          ))}
          {[1, 2].map((i) => (
            <span key={`h${i}`} className="absolute inset-x-0 h-px bg-white/45" style={{ top: `${(i * 100) / 3}%` }} />
          ))}
        </div>
      )}
      {overlays.center && (
        <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-1/2 h-full w-px -translate-x-1/2 bg-white/80" />
          <span className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
        </div>
      )}
      {overlays.safe && (
        <>
          <div className="absolute border border-dashed border-white/50" style={{ inset: "3.5%" }} />
          <div className="absolute border border-dashed border-amber-bright/70" style={{ inset: "5%" }} />
        </>
      )}
    </>
  );
}

function CalibratePanel({
  deviceLabel,
  calibrations,
  selectedId,
  onSelect,
  onSaved,
  onClose,
}: {
  deviceLabel: string;
  calibrations: { id: string; label: string; fov: number }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onSaved: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [state, run, pending] = useActionState(saveCalibration, null);
  const [width, setWidth] = useState("297");
  const [method, setMethod] = useState<"measure" | "direct">("measure");
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[15px] font-black">{t("Calibrate this phone camera")}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-faint" aria-label={t("Close")}>
          <X className="size-4" />
        </button>
      </div>
      {calibrations.length > 0 && (
        <label className={`${labelCls} mt-2`}>
          {t("Saved calibrations")}
          <select value={selectedId} onChange={(e) => onSelect(e.target.value)} className={`${field} mt-1`}>
            <option value="">{t("Match the current camera automatically")}</option>
            {calibrations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.fov.toFixed(1)}°
              </option>
            ))}
          </select>
        </label>
      )}
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] font-semibold text-muted">
        <li>{t("Hold the phone in landscape. Put a sheet of A4 paper flat on a wall.")}</li>
        <li>{t("Move until the paper's long side exactly fills the width of the preview (switch the guides off to see the edges).")}</li>
        <li>{t("Measure the distance from the phone's camera to the wall and enter it below.")}</li>
      </ol>
      <form action={run} className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="method" value={method} />
        <label className={`${labelCls} sm:col-span-2`}>
          {t("Camera name")}
          <input name="label" defaultValue={deviceLabel || "Main camera"} maxLength={80} className={`${field} mt-1`} />
        </label>
        {method === "measure" ? (
          <>
            <label className={labelCls}>
              {t("Object width (mm)")}
              <select name="width" value={width} onChange={(e) => setWidth(e.target.value)} className={`${field} mt-1`}>
                <option value="297">{t("A4 long side · 297")}</option>
                <option value="210">{t("A4 short side · 210")}</option>
                <option value="420">{t("A3 long side · 420")}</option>
                <option value="1000">{t("1 metre")}</option>
              </select>
            </label>
            <label className={labelCls}>
              {t("Distance (cm)")}
              <input name="distance" inputMode="decimal" required className={`${field} mt-1`} placeholder="30" />
            </label>
          </>
        ) : (
          <label className={`${labelCls} sm:col-span-2`}>
            {t("Field of view across the long side (°)")}
            <input name="fov" inputMode="decimal" required className={`${field} mt-1`} placeholder="67.5" />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
          <button disabled={pending} className={buttonClass("primary", "md")}>
            {pending ? t("Saving…") : t("Save calibration")}
          </button>
          <button type="button" onClick={() => setMethod(method === "measure" ? "direct" : "measure")} className="text-[12.5px] font-bold text-accent underline">
            {method === "measure" ? t("I know the field of view") : t("Measure with paper instead")}
          </button>
        </div>
      </form>
      {state?.error && <p className="mt-2 text-[13px] font-bold text-danger">{t(state.error)}</p>}
      {state?.ok && <p className="mt-2 text-[13px] font-bold text-success-strong">{t("Calibrated: {deg}° across the long side.", { deg: (state.fov ?? 0).toFixed(1) })}</p>}
      <p className="mt-2 text-[12px] font-semibold text-faint">{t("Each phone camera (main, ultra-wide, tele) needs its own calibration. Saved calibrations stay on your account.")}</p>
    </div>
  );
}

function SavePanel({
  capture,
  productions,
  initial,
  meta,
  onClose,
}: {
  capture: { url: string; blob: Blob };
  productions: ProductionOpt[];
  initial: { productionId: string; sceneId: string; shotId: string };
  meta: { focal: number; cameraText: string; sensorText: string; sensorW: number; sensorH: number; aspect: string; calibrated: boolean; phoneFov: number };
  onClose: () => void;
}) {
  const t = useT();
  const [productionId, setProductionId] = useState(productions.some((p) => p.id === initial.productionId) ? initial.productionId : (productions[0]?.id ?? ""));
  const prod = productions.find((p) => p.id === productionId);
  const [sceneId, setSceneId] = useState(prod?.scenes.some((s) => s.id === initial.sceneId) ? initial.sceneId : (prod?.scenes[0]?.id ?? ""));
  const scene = prod?.scenes.find((s) => s.id === sceneId);
  const [shotId, setShotId] = useState(scene?.shots.some((s) => s.id === initial.shotId) ? initial.shotId : "");
  const [state, run, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveReference>> | null, fd: FormData) => {
    fd.set("image", new File([capture.blob], `frame-${meta.focal}mm.jpg`, { type: "image/jpeg" }));
    return saveReference(prev, fd);
  }, null);

  return (
    <div className="rounded-2xl border-2 border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[15px] font-black">{t("Save to Shot List")}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-faint" aria-label={t("Close")}>
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[260px_1fr]">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capture.url} alt={t("Captured frame")} className="w-full rounded-xl border-2 border-line" />
          <figcaption className="mt-1 text-[12px] font-semibold text-muted">
            {meta.focal} mm · {meta.cameraText} · {meta.sensorText} {meta.aspect && `· ${meta.aspect}`} {!meta.calibrated && `· ${t("approximate")}`}
          </figcaption>
          <a href={capture.url} download={`frame-${meta.focal}mm.jpg`} className={`${buttonClass("ghost", "sm")} mt-1`}>
            <Download className="size-3.5" aria-hidden /> {t("Download")}
          </a>
        </figure>
        {productions.length === 0 ? (
          <p className="text-[14px] font-semibold text-muted">
            {t("You aren't on a production where you can edit the shot list yet.")}{" "}
            <Link href="/production/new" className="text-accent underline">
              {t("Create a production")}
            </Link>
          </p>
        ) : state?.ok ? (
          <div className="space-y-2">
            <p className="text-[14px] font-extrabold text-success-strong">{t(state.ok)}</p>
            {state.href && (
              <Link href={state.href} className={buttonClass("primary", "md")}>
                {t("Open in the shot list")}
              </Link>
            )}
          </div>
        ) : (
          <form action={run} className="space-y-3">
            <input type="hidden" name="productionId" value={productionId} />
            <input type="hidden" name="focalLength" value={meta.focal} />
            <input type="hidden" name="cameraLabel" value={meta.cameraText} />
            <input type="hidden" name="sensorLabel" value={meta.sensorText} />
            <input type="hidden" name="sensorWidthMm" value={meta.sensorW} />
            <input type="hidden" name="sensorHeightMm" value={meta.sensorH} />
            <input type="hidden" name="aspect" value={meta.aspect} />
            <input type="hidden" name="calibrated" value={String(meta.calibrated)} />
            <input type="hidden" name="phoneFovDeg" value={meta.phoneFov} />
            <label className={labelCls}>
              {t("Production")}
              <select
                value={productionId}
                onChange={(e) => {
                  setProductionId(e.target.value);
                  const p = productions.find((x) => x.id === e.target.value);
                  setSceneId(p?.scenes[0]?.id ?? "");
                  setShotId("");
                }}
                className={`${field} mt-1`}
              >
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            {prod && prod.scenes.length === 0 ? (
              <p className="text-[13px] font-bold text-amber">
                {t("This production has no scenes yet.")}{" "}
                <Link href={`/production/${prod.id}/scenes`} className="underline">
                  {t("Add a scene")}
                </Link>
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  {t("Scene")}
                  <select
                    name="sceneId"
                    value={sceneId}
                    onChange={(e) => {
                      setSceneId(e.target.value);
                      setShotId("");
                    }}
                    className={`${field} mt-1`}
                  >
                    {prod?.scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  {t("Shot")}
                  <select name="shotId" value={shotId} onChange={(e) => setShotId(e.target.value)} className={`${field} mt-1`}>
                    <option value="">{t("+ New shot")}</option>
                    {scene?.shots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!shotId && (
                  <>
                    <label className={labelCls}>
                      {t("New shot code")}
                      <input name="newShotCode" maxLength={12} placeholder={t("auto")} className={`${field} mt-1`} />
                    </label>
                    <label className={labelCls}>
                      {t("Description")}
                      <input name="newShotDescription" maxLength={1000} className={`${field} mt-1`} />
                    </label>
                  </>
                )}
              </div>
            )}
            <label className={labelCls}>
              {t("Note (creative or technical)")}
              <input name="note" maxLength={600} placeholder={t("e.g. Feels more isolated than the 35")} className={`${field} mt-1`} />
            </label>
            {state?.error && <p className="text-[13px] font-bold text-danger">{t(state.error)}</p>}
            <button disabled={pending || !sceneId} className={buttonClass("primary", "lg")}>
              <Save className="size-4" aria-hidden /> {pending ? t("Saving…") : t("Save to Shot List")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
