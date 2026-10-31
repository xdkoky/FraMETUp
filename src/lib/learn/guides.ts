import { b, type Guide, type Reference } from "./types";

/**
 * Real outside resources per unit, found by web search. Links only — no third-party
 * content is copied. Keep every entry verifiable: if a page moves, fix or remove it.
 */
export const GUIDES: Record<string, Guide[]> = {
  camera: [
    { kind: "video", title: "Shutter Angle in Cinematography Explained", source: "In Depth Cine", url: "https://www.indepthcine.com/videos/shutter-angle", note: b("A clear visual explanation of shutter angle and motion blur.", "Szemléletes magyarázat a zárszögről és a bemozdulásról.") },
    { kind: "article", title: "What is the 180 degree shutter rule?", source: "StudioBinder", url: "https://www.studiobinder.com/blog/what-is-the-180-degree-shutter-rule/", note: b("The 180° rule with examples of when to break it.", "A 180°-os szabály példákkal arra, mikor érdemes megszegni.") },
  ],
  exposure: [
    { kind: "article", title: "The Exposure Triangle", source: "StudioBinder", url: "https://www.studiobinder.com/blog/exposure-triangle/", note: b("Aperture, shutter and ISO with film examples.", "Blende, zár és ISO filmes példákkal.") },
    { kind: "article", title: "ND Filters Guide", source: "Artlist", url: "https://artlist.io/blog/nd-filters/", note: b("How ND fits into exposure on bright days.", "Hogyan illeszkedik az ND az expozícióba napos időben.") },
  ],
  lenses: [
    { kind: "tool", title: "Frame Line & Lens Illumination Tool", source: "ARRI", url: "https://www.arri.com/en/learn-help/learn-help-camera-system/tools/frame-line-lens-illumination-tool", note: b("See how real cinema lenses cover different sensor formats.", "Nézd meg, hogyan fedik le a valódi mozis objektívek a különböző szenzorformátumokat.") },
    { kind: "tool", title: "Field of View Tool 2.0", source: "AbelCine", url: "https://www.abelcine.com/articles/blog-and-knowledge/tools-charts-and-downloads/abelcine-fov-tool-20", note: b("Compare camera and lens combinations side by side.", "Hasonlíts össze kamera–objektív párosításokat egymás mellett.") },
    { kind: "book", title: "Cinematography: Theory and Practice", source: "Blain Brown", note: b("The standard textbook for the whole track.", "Az egész pálya alap tankönyve.") },
  ],
  composition: [
    { kind: "video", title: "Ultimate Guide to Camera Angles (The Shot List, Ep. 3)", source: "StudioBinder", youtube: "wLfZL9PZI9k", url: "https://www.youtube.com/watch?v=wLfZL9PZI9k", note: b("Every camera angle explained with film clips.", "Minden gépállás filmrészletekkel magyarázva.") },
    { kind: "article", title: "Types of Camera Shots", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("Shot sizes and how to combine them with angles and movement.", "Plánok, és hogyan kombináld őket gépállással és mozgással.") },
    { kind: "book", title: "The Five C's of Cinematography", source: "Joseph V. Mascelli", note: b("Classic book on camera angles, continuity, cutting, close-ups and composition.", "Klasszikus könyv a gépállásról, csatlakozásról, vágásról, közeliről és kompozícióról.") },
  ],
  movement: [
    { kind: "article", title: "Types of Camera Shots (movement section)", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("Pans, tilts, dollies and more, with clips.", "Pánozás, billentés, kocsizás és a többi, részletekkel.") },
  ],
  coverage: [
    { kind: "article", title: "Blocking and Staging Scenes", source: "StudioBinder", url: "https://www.studiobinder.com/blog/blocking-and-staging-scenes/", note: b("How staging and camera placement work together.", "Hogyan működik együtt a térbeli rendezés és a kamera elhelyezése.") },
  ],
  light: [
    { kind: "article", title: "Three-point lighting", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Three-point_lighting", note: b("Key, fill and back light, with a diagram.", "Fő-, derítő- és ellenfény, ábrával.") },
    { kind: "article", title: "How to Light Faces: 3 Cinematic Lighting Setups", source: "Aputure", url: "https://medium.com/aputure/how-to-light-faces-3-cinematic-lighting-setups-90ab68368c5d", note: b("Three face-lighting setups from working DPs.", "Három arcvilágítási felállás gyakorló operatőröktől.") },
  ],
  setups: [
    { kind: "article", title: "Laws of Light: Three-Point Lighting", source: "The Slanted Lens", url: "https://theslantedlens.com/laws-of-light-three-point-lighting/", note: b("Building a three-point setup step by step.", "Háromfényes felállás lépésről lépésre.") },
    { kind: "article", title: "How to Light Faces: 3 Cinematic Lighting Setups", source: "Aputure", url: "https://medium.com/aputure/how-to-light-faces-3-cinematic-lighting-setups-90ab68368c5d", note: b("Motivated setups for faces.", "Motivált felállások arcokhoz.") },
  ],
  colour: [
    { kind: "book", title: "The Colorist Guide to DaVinci Resolve (free PDF)", source: "Blackmagic Design", url: "https://www.blackmagicdesign.com/products/davinciresolve/training", note: b("Official, free hands-on grading course with practice footage.", "Hivatalos, ingyenes gyakorlati színezőkurzus gyakorló felvételekkel.") },
  ],
  script: [
    { kind: "article", title: "How to Develop Story Beats", source: "MovieMaker", url: "https://www.moviemaker.com/how-to-develop-story-beats-screenplay-screenwriting/amp/", note: b("A director's way of charting beats page by page.", "Egy rendező módszere az ütemek oldalankénti feltérképezésére.") },
  ],
  actors: [
    { kind: "book", title: "Directing Actors: Creating Memorable Performances for Film and Television", source: "Judith Weston", note: b("The classic on playable direction and action verbs.", "A játszható instrukciók és cselekvő igék klasszikusa.") },
    { kind: "article", title: "Directing with Action Verbs", source: "USC — Game-Based Pedagogy", url: "https://scalar.usc.edu/works/experiments-in-game-based-pedagogy/directing-with-action-verbs-flat", note: b("A classroom game for practising action-verb direction.", "Tantermi játék a cselekvő igés instrukció gyakorlására.") },
  ],
  staging: [
    { kind: "article", title: "Blocking and Staging Scenes", source: "StudioBinder", url: "https://www.studiobinder.com/blog/blocking-and-staging-scenes/", note: b("How great directors block and stage scenes.", "Hogyan alakítják ki a nagy rendezők a mozgásrendet és a térbeli rendezést.") },
  ],
  shotdesign: [
    { kind: "video", title: "Ultimate Guide to Camera Angles (The Shot List, Ep. 3)", source: "StudioBinder", youtube: "wLfZL9PZI9k", url: "https://www.youtube.com/watch?v=wLfZL9PZI9k", note: b("Angles as storytelling choices.", "A gépállások mint történetmesélő döntések.") },
    { kind: "article", title: "Types of Camera Shots", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("A reference for planning shot progressions.", "Referencia a beállítások ívének tervezéséhez.") },
  ],
  edit: [
    { kind: "article", title: "Walter Murch's Rule of Six", source: "StudioBinder", url: "https://www.studiobinder.com/blog/walter-murch-rule-of-six/", note: b("Emotion, story, rhythm and more — how to judge a cut.", "Érzelem, történet, ritmus és a többi — hogyan ítélj meg egy vágást.") },
    { kind: "book", title: "In the Blink of an Eye", source: "Walter Murch", note: b("A short, essential book on how editing works.", "Rövid, alapvető könyv arról, hogyan működik a vágás.") },
  ],
};

/**
 * Openly licensed reference pictures per lesson. Empty until the hosts they come from
 * (e.g. commons.wikimedia.org) are reachable to verify licence and author. Every entry
 * must carry a credit, a licence and a source link — a test enforces it.
 */
export const REFERENCES: Record<string, Reference[]> = {};
