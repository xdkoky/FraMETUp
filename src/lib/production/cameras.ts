/**
 * Bundled cinema camera profiles. Only modes whose active-area dimensions were confirmed in
 * manufacturer documentation are included, each with its source. These are examples of
 * supported profiles — not a statement about which cameras Lloyd Studio owns. Users can add
 * any other camera or mode as a custom profile.
 */

export interface SensorMode {
  key: string;
  name: string;
  widthMm: number;
  heightMm: number;
  category: "Super 35" | "Full frame" | "Large format" | "Custom";
}

export interface CameraProfileDef {
  id: string;
  manufacturer: string;
  model: string;
  modes: SensorMode[];
  source?: string;
  custom?: boolean;
}

export const BUNDLED_CAMERAS: CameraProfileDef[] = [
  {
    id: "arri-alexa-35",
    manufacturer: "ARRI",
    model: "ALEXA 35",
    source: "https://www.arri.com/alexa35",
    modes: [
      { key: "4.6k-og", name: "4.6K 3:2 Open Gate", widthMm: 27.99, heightMm: 19.22, category: "Super 35" },
      { key: "4.6k-169", name: "4.6K 16:9", widthMm: 28.0, heightMm: 15.7, category: "Super 35" },
    ],
  },
  {
    id: "arri-alexa-mini",
    manufacturer: "ARRI",
    model: "ALEXA Mini",
    source: "https://www.arri.com/resource/blob/178064/d84031615b6bf09446aeb7972066b129/alexa-mini-recording-areas-surround-views-and-framelines-sup-4-0-data.pdf",
    modes: [
      { key: "3.4k-og", name: "3.4K Open Gate", widthMm: 28.25, heightMm: 18.17, category: "Super 35" },
      { key: "2.8k-169", name: "2.8K 16:9", widthMm: 23.76, heightMm: 13.37, category: "Super 35" },
      { key: "2.8k-43", name: "2.8K 4:3", widthMm: 23.76, heightMm: 17.82, category: "Super 35" },
    ],
  },
  {
    id: "arri-alexa-mini-lf",
    manufacturer: "ARRI",
    model: "ALEXA Mini LF",
    source: "https://www.arri.com/resource/blob/261224/0654da7b1dda042b23b1b6c254c1f8c3/alexa-mini-lf-flyer-technical-data-sheet-data.pdf",
    modes: [
      { key: "lf-og", name: "4.5K LF Open Gate", widthMm: 36.7, heightMm: 25.54, category: "Large format" },
      { key: "lf-uhd", name: "UHD 16:9", widthMm: 31.68, heightMm: 17.82, category: "Large format" },
    ],
  },
  {
    id: "red-komodo",
    manufacturer: "RED",
    model: "KOMODO 6K",
    source: "https://www.red.com/press",
    modes: [{ key: "6k", name: "6K 17:9", widthMm: 27.03, heightMm: 14.26, category: "Super 35" }],
  },
  {
    id: "red-v-raptor-vv",
    manufacturer: "RED",
    model: "V-RAPTOR 8K VV",
    source: "https://www.red.com/press",
    modes: [{ key: "8k-vv", name: "8K VV 17:9", widthMm: 40.96, heightMm: 21.6, category: "Large format" }],
  },
  {
    id: "generic",
    manufacturer: "Reference",
    model: "Standard formats",
    modes: [{ key: "ff", name: "Full frame 36 × 24", widthMm: 36, heightMm: 24, category: "Full frame" }],
  },
];

export function findMode(cameras: CameraProfileDef[], cameraId: string, modeKey: string) {
  const cam = cameras.find((c) => c.id === cameraId);
  const mode = cam?.modes.find((m) => m.key === modeKey) ?? cam?.modes[0];
  return cam && mode ? { cam, mode } : null;
}
