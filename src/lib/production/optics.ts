/**
 * Virtual Viewfinder optics. All angles in degrees, sizes in millimetres.
 * Rectilinear lenses only: FOV = 2·atan(d / 2f). No distortion, breathing or depth of field.
 */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function fov(sensorMm: number, focalMm: number): number {
  if (!(sensorMm > 0) || !(focalMm > 0)) throw new Error("Sensor size and focal length must be positive.");
  return deg(2 * Math.atan(sensorMm / (2 * focalMm)));
}

export interface SensorArea {
  widthMm: number;
  heightMm: number;
}

export function sensorFov(s: SensorArea, focalMm: number) {
  return { h: fov(s.widthMm, focalMm), v: fov(s.heightMm, focalMm), d: fov(Math.hypot(s.widthMm, s.heightMm), focalMm) };
}

/** Full-frame (36 × 24 mm) equivalent focal length by matching the horizontal field of view. */
export function fullFrameEquivalent(s: SensorArea, focalMm: number) {
  return focalMm * (36 / s.widthMm);
}

/** Crop factor relative to full frame, by diagonal (the conventional definition). */
export function cropFactor(s: SensorArea) {
  return Math.hypot(36, 24) / Math.hypot(s.widthMm, s.heightMm);
}

/**
 * Applies a recording frame (aspect ratio) inside an active sensor area: the image is
 * letterboxed or pillarboxed to the target ratio using as much of the area as possible.
 */
export function frameWithin(s: SensorArea, aspect: number | null): SensorArea {
  if (!aspect) return s;
  const native = s.widthMm / s.heightMm;
  return aspect >= native ? { widthMm: s.widthMm, heightMm: s.widthMm / aspect } : { widthMm: s.heightMm * aspect, heightMm: s.heightMm };
}

/** Converts the phone's long-side FOV into the FOV across the width of a stream of a given shape. */
export function streamFov(longSideFovDeg: number, streamWidth: number, streamHeight: number) {
  const long = Math.max(streamWidth, streamHeight);
  const t = Math.tan(rad(longSideFovDeg) / 2);
  const h = deg(2 * Math.atan((t * streamWidth) / long));
  const v = deg(2 * Math.atan((t * streamHeight) / long));
  return { h, v };
}

/**
 * Phone FOV from a simple measurement: an object of known width (e.g. an A4 sheet, 297 mm)
 * exactly spans the long side of the preview at a measured distance from the phone.
 */
export function calibrateFromMeasurement(objectWidthMm: number, distanceMm: number) {
  if (!(objectWidthMm > 0) || !(distanceMm > 0)) throw new Error("Width and distance must be positive.");
  return deg(2 * Math.atan(objectWidthMm / (2 * distanceMm)));
}

/**
 * Typical phone main cameras are marketed around 24–26 mm full-frame equivalent on a 4:3
 * sensor. Without calibration we assume 26 mm equivalent — flagged as approximate in the UI.
 */
export const UNCALIBRATED_LONG_SIDE_FOV = (() => {
  // 35 mm-equivalent focal lengths are defined on the 43.27 mm diagonal; long side of 4:3 = 0.8 × diagonal.
  const diag = Math.hypot(36, 24);
  return deg(2 * Math.atan((0.8 * diag) / (2 * 26)));
})();

export interface FramingInput {
  /** Long-side FOV of the phone camera (calibrated or assumed). */
  phoneLongSideFovDeg: number;
  streamWidth: number;
  streamHeight: number;
  /** The cinema frame to show: active sensor area after any recording crop / aspect. */
  frame: SensorArea;
  focalMm: number;
}

export interface Framing {
  targetH: number;
  targetV: number;
  phoneH: number;
  phoneV: number;
  /** How much wider than the frame the displayed video must be (video width / frame width). */
  scale: number;
  /** Frame shape to draw (width / height). */
  frameAspect: number;
  fitsH: boolean;
  fitsV: boolean;
  /** Real phone pixels across the simulated frame — low numbers mean a soft, cropped preview. */
  effectivePixels: number;
}

/**
 * Where the cinema frame sits inside the phone image. If the lens is narrower than the phone
 * camera we crop in (scale > 1). If it's wider than the phone can see we report it — the UI
 * must show a limitation, never stretch the image.
 */
export function computeFraming(i: FramingInput): Framing {
  const target = { h: fov(i.frame.widthMm, i.focalMm), v: fov(i.frame.heightMm, i.focalMm) };
  const phone = streamFov(i.phoneLongSideFovDeg, i.streamWidth, i.streamHeight);
  const scale = Math.tan(rad(phone.h) / 2) / Math.tan(rad(target.h) / 2);
  const scaleV = Math.tan(rad(phone.v) / 2) / Math.tan(rad(target.v) / 2);
  return {
    targetH: target.h,
    targetV: target.v,
    phoneH: phone.h,
    phoneV: phone.v,
    scale,
    frameAspect: i.frame.widthMm / i.frame.heightMm,
    fitsH: scale >= 0.999,
    fitsV: scaleV >= 0.999,
    effectivePixels: Math.round(i.streamWidth / Math.max(scale, 1e-6)),
  };
}

export const ASPECT_PRESETS: { label: string; value: number | null }[] = [
  { label: "Sensor", value: null },
  { label: "16:9", value: 16 / 9 },
  { label: "1.85:1", value: 1.85 },
  { label: "2.39:1", value: 2.39 },
  { label: "4:3", value: 4 / 3 },
];

export const FOCAL_PRESETS = [18, 24, 28, 35, 50, 75, 85, 100];

export function parseAspect(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(?::|\/|x)\s*(\d+(?:\.\d+)?)$/i);
  if (m) return Number(m[1]) / Number(m[2]);
  const n = Number(s);
  return Number.isFinite(n) && n > 0.2 && n < 5 ? n : null;
}
