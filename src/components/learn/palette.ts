/** One colour per unit on the learning path. */
export const UNIT_COLORS = ["#2F7CF6", "#14A89A", "#F2A100", "#8B5CF6", "#E5484D", "#22A55B", "#F27522", "#E0479E", "#0EA2D8", "#5B61E8", "#6FA31A"];

export const unitColor = (i: number) => UNIT_COLORS[i % UNIT_COLORS.length];
export const darker = (c: string) => `color-mix(in srgb, ${c} 72%, black)`;
