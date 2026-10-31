import { b, type Guide, type Reference } from "./types";

/**
 * Real outside resources per unit, found by web search. Links only — no third-party
 * content is copied. Keep every entry verifiable: if a page moves, fix or remove it.
 */
export const GUIDES: Record<string, Guide[]> = {
  camera: [
    { kind: "video", title: "Shutter Angle In Cinematography Explained", source: "In Depth Cine", youtube: "ehpdzt0JHUc", url: "https://www.youtube.com/watch?v=ehpdzt0JHUc", note: b("Shutter angle and motion blur, shown on real footage.", "A zárszög és a bemozdulás valódi felvételeken bemutatva.") },
    { kind: "video", title: "The 3 Basics Of Cinematography", source: "In Depth Cine", youtube: "Ow7w7FUAkdk", url: "https://www.youtube.com/watch?v=Ow7w7FUAkdk", note: b("Exposure, lens and light — the three foundations.", "Expozíció, objektív és fény — a három alapkő.") },
    { kind: "article", title: "What is the 180 degree shutter rule?", source: "StudioBinder", url: "https://www.studiobinder.com/blog/what-is-the-180-degree-shutter-rule/", note: b("The 180° rule with examples of when to break it.", "A 180°-os szabály példákkal arra, mikor érdemes megszegni.") },
  ],
  exposure: [
    { kind: "video", title: "How Cinematographers Set Their Exposure", source: "In Depth Cine", youtube: "f8Ame_LJDOU", url: "https://www.youtube.com/watch?v=f8Ame_LJDOU", note: b("How working DoPs actually decide exposure on set.", "Hogyan dönt a gyakorló operatőr az expozícióról a forgatáson.") },
    { kind: "video", title: "Ultimate Guide to Camera Aperture — What is Aperture & the Exposure Triangle Explained", source: "StudioBinder", youtube: "SOrROvRx-XM", url: "https://www.youtube.com/watch?v=SOrROvRx-XM", note: b("Aperture and the exposure triangle with film examples.", "A blende és az expozíciós háromszög filmes példákkal.") },
    { kind: "article", title: "The Exposure Triangle", source: "StudioBinder", url: "https://www.studiobinder.com/blog/exposure-triangle/", note: b("Aperture, shutter and ISO with film examples.", "Blende, zár és ISO filmes példákkal.") },
    { kind: "article", title: "ND Filters Guide", source: "Artlist", url: "https://artlist.io/blog/nd-filters/", note: b("How ND fits into exposure on bright days.", "Hogyan illeszkedik az ND az expozícióba napos időben.") },
  ],
  lenses: [
    { kind: "video", title: "Why Lens Choice Matters In Cinematography | Focal Lengths", source: "In Depth Cine", youtube: "JAZ7mXRDa7M", url: "https://www.youtube.com/watch?v=JAZ7mXRDa7M", note: b("What different focal lengths do to faces and space.", "Mit tesznek a különböző gyújtótávolságok az arcokkal és a térrel.") },
    { kind: "video", title: "Depth of Field Explained: Ultimate Guide to Camera Focus", source: "StudioBinder", youtube: "ZGNUqNFfD8M", url: "https://www.youtube.com/watch?v=ZGNUqNFfD8M", note: b("Depth of field and focus as storytelling tools.", "Mélységélesség és élesség mint történetmesélő eszköz.") },
    { kind: "tool", title: "Frame Line & Lens Illumination Tool", source: "ARRI", url: "https://www.arri.com/en/learn-help/learn-help-camera-system/tools/frame-line-lens-illumination-tool", note: b("See how real cinema lenses cover different sensor formats.", "Nézd meg, hogyan fedik le a valódi mozis objektívek a különböző szenzorformátumokat.") },
    { kind: "tool", title: "Field of View Tool 2.0", source: "AbelCine", url: "https://www.abelcine.com/articles/blog-and-knowledge/tools-charts-and-downloads/abelcine-fov-tool-20", note: b("Compare camera and lens combinations side by side.", "Hasonlíts össze kamera–objektív párosításokat egymás mellett.") },
    { kind: "book", title: "Cinematography: Theory and Practice", source: "Blain Brown", note: b("The standard textbook for the whole track.", "Az egész pálya alap tankönyve.") },
  ],
  composition: [
    { kind: "video", title: "Ultimate Guide to Camera Shots: Every Shot Size Explained", source: "StudioBinder", youtube: "AyML8xuKfoc", url: "https://www.youtube.com/watch?v=AyML8xuKfoc", note: b("Every shot size, from extreme wide to insert.", "Minden plán a nagytotáltól az inzertig.") },
    { kind: "video", title: "Camera Framing: Shot Composition & Cinematography Techniques Explained", source: "StudioBinder", youtube: "qQNiqzuXjoM", url: "https://www.youtube.com/watch?v=qQNiqzuXjoM", note: b("Framing and composition techniques in famous scenes.", "Képkivágás és kompozíció híres jelenetekben.") },
    { kind: "article", title: "Types of Camera Shots", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("Shot sizes and how to combine them with angles and movement.", "Plánok, és hogyan kombináld őket gépállással és mozgással.") },
    { kind: "book", title: "The Five C's of Cinematography", source: "Joseph V. Mascelli", note: b("Classic book on camera angles, continuity, cutting, close-ups and composition.", "Klasszikus könyv a gépállásról, csatlakozásról, vágásról, közeliről és kompozícióról.") },
  ],
  movement: [
    { kind: "video", title: "Ultimate Guide to Camera Movement — Every Camera Movement Technique Explained", source: "StudioBinder", youtube: "IiyBo-qLDeM", url: "https://www.youtube.com/watch?v=IiyBo-qLDeM", note: b("Every camera move and what it says.", "Minden kameramozgás, és hogy mit mond.") },
    { kind: "video", title: "Camera Gear: Every Type of Camera Rig Explained", source: "StudioBinder", youtube: "heJ9hWNb10g", url: "https://www.youtube.com/watch?v=heJ9hWNb10g", note: b("Tripods, dollies, gimbals, Steadicam and cranes compared.", "Állvány, kocsi, gimbal, Steadicam és daru összehasonlítva.") },
    { kind: "article", title: "Types of Camera Shots (movement section)", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("Pans, tilts, dollies and more, with clips.", "Pánozás, billentés, kocsizás és a többi, részletekkel.") },
  ],
  coverage: [
    { kind: "video", title: "How To Shoot A Scene With A Single Camera", source: "In Depth Cine", youtube: "jq5SNLM0gzQ", url: "https://www.youtube.com/watch?v=jq5SNLM0gzQ", note: b("Planning coverage and shooting order with one camera.", "Fedés és forgatási sorrend tervezése egy kamerával.") },
    { kind: "video", title: "The 180 Degree Rule in Film (and How to Break The Line)", source: "StudioBinder", youtube: "iW0bKUfvH2c", url: "https://www.youtube.com/watch?v=iW0bKUfvH2c", note: b("The 180° rule and legal ways to cross it.", "A 180 fokos szabály és a szabályos átlépés módjai.") },
    { kind: "article", title: "Blocking and Staging Scenes", source: "StudioBinder", url: "https://www.studiobinder.com/blog/blocking-and-staging-scenes/", note: b("How staging and camera placement work together.", "Hogyan működik együtt a térbeli rendezés és a kamera elhelyezése.") },
  ],
  light: [
    { kind: "video", title: "5 Lighting Concepts Every Cinematographer Needs To Know", source: "In Depth Cine", youtube: "uAglas428D8", url: "https://www.youtube.com/watch?v=uAglas428D8", note: b("Quality, direction, contrast and more, clearly explained.", "Minőség, irány, kontraszt és a többi, világosan elmagyarázva.") },
    { kind: "video", title: "Color Temperature Explained — The Cinematographer's Guide to White Balance & Color Temp Fundamentals", source: "StudioBinder", youtube: "APLq7aPlDhk", url: "https://www.youtube.com/watch?v=APLq7aPlDhk", note: b("Colour temperature and white balance basics.", "A színhőmérséklet és a fehéregyensúly alapjai.") },
    { kind: "article", title: "Three-point lighting", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Three-point_lighting", note: b("Key, fill and back light, with a diagram.", "Fő-, derítő- és ellenfény, ábrával.") },
    { kind: "article", title: "How to Light Faces: 3 Cinematic Lighting Setups", source: "Aputure", url: "https://medium.com/aputure/how-to-light-faces-3-cinematic-lighting-setups-90ab68368c5d", note: b("Three face-lighting setups from working DPs.", "Három arcvilágítási felállás gyakorló operatőröktől.") },
  ],
  setups: [
    { kind: "video", title: "Motivated Lighting Examples by Roger Deakins — Cinematography Techniques Ep. 4", source: "StudioBinder", youtube: "X3906cbElbQ", url: "https://www.youtube.com/watch?v=X3906cbElbQ", note: b("How Roger Deakins motivates his light.", "Hogyan motiválja Roger Deakins a fényt.") },
    { kind: "video", title: "Roger Deakins and the Art of Practical Lighting — Cinematography Techniques Ep. 3", source: "StudioBinder", youtube: "G_0M_GHw9GI", url: "https://www.youtube.com/watch?v=G_0M_GHw9GI", note: b("Lighting with practicals in shot.", "Világítás a képben lévő lámpákkal.") },
    { kind: "video", title: "Ultimate Guide to Cinematic Lighting Pt. 2 — How to Light Subjects and Locations", source: "StudioBinder", youtube: "N9mPQBZe06s", url: "https://www.youtube.com/watch?v=N9mPQBZe06s", note: b("Lighting faces and locations step by step.", "Arcok és helyszínek világítása lépésről lépésre.") },
    { kind: "article", title: "Laws of Light: Three-Point Lighting", source: "The Slanted Lens", url: "https://theslantedlens.com/laws-of-light-three-point-lighting/", note: b("Building a three-point setup step by step.", "Háromfényes felállás lépésről lépésre.") },
    { kind: "article", title: "How to Light Faces: 3 Cinematic Lighting Setups", source: "Aputure", url: "https://medium.com/aputure/how-to-light-faces-3-cinematic-lighting-setups-90ab68368c5d", note: b("Motivated setups for faces.", "Motivált felállások arcokhoz.") },
  ],
  colour: [
    { kind: "video", title: "Color Grading 101 - Everything You Need to Know", source: "Film Riot", youtube: "pAh83khT1no", url: "https://www.youtube.com/watch?v=pAh83khT1no", note: b("A practical first grading lesson.", "Gyakorlatias első színezőlecke.") },
    { kind: "video", title: "Color Theory in Film — Color Psychology for Directors", source: "StudioBinder", youtube: "lINVnA3rVIE", url: "https://www.youtube.com/watch?v=lINVnA3rVIE", note: b("How colour carries meaning on screen.", "Hogyan hordoz jelentést a szín a vásznon.") },
    { kind: "book", title: "The Colorist Guide to DaVinci Resolve (free PDF)", source: "Blackmagic Design", url: "https://www.blackmagicdesign.com/products/davinciresolve/training", note: b("Official, free hands-on grading course with practice footage.", "Hivatalos, ingyenes gyakorlati színezőkurzus gyakorló felvételekkel.") },
  ],
  script: [
    { kind: "video", title: "How to Make Your Audience Feel — Emotion Theory in Movies", source: "StudioBinder", youtube: "IkDONK7ECt0", url: "https://www.youtube.com/watch?v=IkDONK7ECt0", note: b("How scenes are built to produce feeling.", "Hogyan épülnek fel a jelenetek, hogy érzést keltsenek.") },
    { kind: "article", title: "How to Develop Story Beats", source: "MovieMaker", url: "https://www.moviemaker.com/how-to-develop-story-beats-screenplay-screenwriting/amp/", note: b("A director's way of charting beats page by page.", "Egy rendező módszere az ütemek oldalankénti feltérképezésére.") },
  ],
  actors: [
    { kind: "video", title: "How to Direct Actors — Directing Advice from the Greats", source: "StudioBinder", youtube: "kDzUx6t09tg", url: "https://www.youtube.com/watch?v=kDzUx6t09tg", note: b("Great directors on working with actors.", "Nagy rendezők a színészekkel való munkáról.") },
    { kind: "video", title: "Directing Actors — 24 Filmmakers on Writing, Casting, Prep, and Shooting", source: "StudioBinder", youtube: "SJyTb90neKs", url: "https://www.youtube.com/watch?v=SJyTb90neKs", note: b("24 filmmakers on casting, prep and the set.", "24 filmes a szereposztásról, a felkészülésről és a forgatásról.") },
    { kind: "book", title: "Directing Actors: Creating Memorable Performances for Film and Television", source: "Judith Weston", note: b("The classic on playable direction and action verbs.", "A játszható instrukciók és cselekvő igék klasszikusa.") },
    { kind: "article", title: "Directing with Action Verbs", source: "USC — Game-Based Pedagogy", url: "https://scalar.usc.edu/works/experiments-in-game-based-pedagogy/directing-with-action-verbs-flat", note: b("A classroom game for practising action-verb direction.", "Tantermi játék a cselekvő igés instrukció gyakorlására.") },
  ],
  staging: [
    { kind: "video", title: "Film Blocking Tutorial — Filmmaking Techniques for Directors", source: "StudioBinder", youtube: "9AGaECt9j4g", url: "https://www.youtube.com/watch?v=9AGaECt9j4g", note: b("Blocking basics for directors.", "A mozgásrend alapjai rendezőknek.") },
    { kind: "video", title: "How Kubrick, Spielberg, and Inarritu Stage their Scenes", source: "StudioBinder", youtube: "o-4rk3T8PbQ", url: "https://www.youtube.com/watch?v=o-4rk3T8PbQ", note: b("Three masters of staging compared.", "A térbeli rendezés három mestere összehasonlítva.") },
    { kind: "video", title: "The Godfather — How to Direct Power (Director's Playbook)", source: "StudioBinder", youtube: "OXwqDkyAmeY", url: "https://www.youtube.com/watch?v=OXwqDkyAmeY", note: b("Power and status through staging.", "Hatalom és státusz a térbeli rendezésen keresztül.") },
    { kind: "article", title: "Blocking and Staging Scenes", source: "StudioBinder", url: "https://www.studiobinder.com/blog/blocking-and-staging-scenes/", note: b("How great directors block and stage scenes.", "Hogyan alakítják ki a nagy rendezők a mozgásrendet és a térbeli rendezést.") },
  ],
  shotdesign: [
    { kind: "video", title: "The Spielberg Oner", source: "Every Frame a Painting", youtube: "8q4X2vDRfRk", url: "https://www.youtube.com/watch?v=8q4X2vDRfRk", note: b("How Spielberg plays whole scenes in one shot.", "Hogyan játszat le Spielberg egész jeleneteket egyetlen beállításban.") },
    { kind: "video", title: "How to Make a Shot List for Film: A Step-by-Step Guide", source: "StudioBinder", youtube: "IhXMpBk3GDA", url: "https://www.youtube.com/watch?v=IhXMpBk3GDA", note: b("Turning a scene into a shot list.", "Hogyan lesz a jelenetből snittlista.") },
    { kind: "article", title: "Types of Camera Shots", source: "StudioBinder", url: "https://studiobinder.com/blog/types-of-camera-shots/", note: b("A reference for planning shot progressions.", "Referencia a beállítások ívének tervezéséhez.") },
  ],
  edit: [
    { kind: "video", title: "6 Ways to Edit Any Scene — Essential Film & Video Editing Techniques Explained", source: "StudioBinder", youtube: "FVR8zz8ci2k", url: "https://www.youtube.com/watch?v=FVR8zz8ci2k", note: b("Six editing approaches for any scene.", "Hat vágási megközelítés bármely jelenethez.") },
    { kind: "video", title: "The Book Every Editor Has to Read — Walter Murch and In the Blink of an Eye", source: "StudioBinder", youtube: "PKYeClvvlTw", url: "https://www.youtube.com/watch?v=PKYeClvvlTw", note: b("Walter Murch's ideas, explained.", "Walter Murch gondolatai elmagyarázva.") },
    { kind: "article", title: "Walter Murch's Rule of Six", source: "StudioBinder", url: "https://www.studiobinder.com/blog/walter-murch-rule-of-six/", note: b("Emotion, story, rhythm and more — how to judge a cut.", "Érzelem, történet, ritmus és a többi — hogyan ítélj meg egy vágást.") },
    { kind: "book", title: "In the Blink of an Eye", source: "Walter Murch", note: b("A short, essential book on how editing works.", "Rövid, alapvető könyv arról, hogyan működik a vágás.") },
  ],
  grip: [
    { kind: "video", title: "Grip Rigs For Cinematic Camera Movement (Part 1)", source: "In Depth Cine", youtube: "lhImyWx5hEw", url: "https://www.youtube.com/watch?v=lhImyWx5hEw", note: b("What grips rig and why.", "Mit szerelnek a gripek, és miért.") },
    { kind: "video", title: "Ultimate Guide to Cinematic Lighting — Types of Light & Gear Explained", source: "StudioBinder", youtube: "r2nD_knsNrc", url: "https://www.youtube.com/watch?v=r2nD_knsNrc", note: b("Fixtures and modifiers explained.", "Lámpatípusok és fényformálók elmagyarázva.") },
  ],
  onset: [
    { kind: "video", title: "Every Film Crew Job In The Camera Department Explained", source: "In Depth Cine", youtube: "XDIzklNU3vI", url: "https://www.youtube.com/watch?v=XDIzklNU3vI", note: b("Who does what in the camera department.", "Ki mit csinál a kamerás részlegben.") },
    { kind: "video", title: "Director Vs Cinematographer: Who Does What?", source: "In Depth Cine", youtube: "vOEY73I-Sec", url: "https://www.youtube.com/watch?v=vOEY73I-Sec", note: b("Where the director's job ends and the DoP's begins.", "Hol ér véget a rendező munkája, és hol kezdődik az operatőré.") },
  ],
  tone: [
    { kind: "video", title: "Edgar Wright - How to Do Visual Comedy", source: "Every Frame a Painting", youtube: "3FOzD4Sfgag", url: "https://www.youtube.com/watch?v=3FOzD4Sfgag", note: b("Tone and genre created with the camera and the cut.", "Hangvétel és műfaj a kamerával és a vágással megteremtve.") },
    { kind: "video", title: "How to Pace Your Film — Examples of Good and Bad Pacing in Editing, Writing and More", source: "StudioBinder", youtube: "a9reuDw4cnU", url: "https://www.youtube.com/watch?v=a9reuDw4cnU", note: b("Good and bad pacing, with examples.", "Jó és rossz tempó példákkal.") },
    { kind: "video", title: "The Science of Sound in Film — Film Sound Recording for Beginners", source: "StudioBinder", youtube: "mXtnHHJFREM", url: "https://www.youtube.com/watch?v=mXtnHHJFREM", note: b("Why sound matters and how it's recorded.", "Miért fontos a hang, és hogyan rögzítik.") },
  ],
  leading: [
    { kind: "video", title: "What A Director Does On Set: Crew Breakdown", source: "In Depth Cine", youtube: "l6pg32juqEY", url: "https://www.youtube.com/watch?v=l6pg32juqEY", note: b("A director's real job during a shooting day.", "A rendező valódi feladata egy forgatási napon.") },
    { kind: "video", title: "20 Film Terms You Should Know Before Stepping On Set", source: "Film Riot", youtube: "mCm-mSYtf6Y", url: "https://www.youtube.com/watch?v=mCm-mSYtf6Y", note: b("The set vocabulary everyone uses.", "A forgatási szókincs, amit mindenki használ.") },
  ],
  voice: [
    { kind: "video", title: "Wes Anderson Explains How to Write & Direct Movies | The Director's Chair", source: "StudioBinder", youtube: "Sdt0oam6O1o", url: "https://www.youtube.com/watch?v=Sdt0oam6O1o", note: b("A distinctive voice in the director's own words.", "Egy sajátos rendezői hang a rendező saját szavaival.") },
  ],
};

/**
 * Openly licensed reference pictures per lesson. Empty until the hosts they come from
 * (e.g. commons.wikimedia.org) are reachable to verify licence and author. Every entry
 * must carry a credit, a licence and a source link — a test enforces it.
 */
export const REFERENCES: Record<string, Reference[]> = {
  "camera.sensor": [
    { src: "/learn/refs/camera-sensor-1.jpg", alt: b("Diagram comparing digital sensor sizes", "Digitális szenzorméreteket összehasonlító ábra"), caption: b("Common sensor formats compared to full frame (36 × 24 mm): smaller sensors crop the image.", "Gyakori szenzorformátumok a full frame-hez (36 × 24 mm) képest: a kisebb szenzor kivág a képből."), credit: "Bproctor (derivative work) / Wikimedia Commons", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Digital_camera_sensor_sizes_comparison.png" },
  ],
  "camera.shutter": [
    { src: "/learn/refs/camera-shutter-1.jpg", alt: b("Man on a subway platform with a blurred train behind", "Férfi a metróperonon, mögötte elmosódott szerelvény"), caption: b("A slow shutter smears the moving train while the still figure stays sharp.", "A lassú zár elkeni a mozgó vonatot, az álló alak éles marad."), credit: "Radomianin / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Man_at_Dundas_subway_station,_Toronto,_2008-05-06.jpg" },
    { src: "/learn/refs/camera-shutter-2.jpg", alt: b("Whirling dancer rendered as a colourful blur", "Forgó táncos színes elmosódásként"), caption: b("Motion blur turns movement into shape — wide shutter, dreamlike feel.", "A bemozdulás formává alakítja a mozgást — tág zár, álomszerű hatás."), credit: "Mohamed Khalil90 / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Folkloric_Tanoura_dance_performed_by_man.jpg" },
  ],
  "exposure.nd": [
    { src: "/learn/refs/exposure-nd-1.jpg", alt: b("Hand holding a neutral density filter in front of a forest stream", "Kéz egy szürkeszűrőt tart egy erdei patak előtt"), caption: b("An ND filter darkens the image evenly without changing colour.", "Az ND-szűrő egyenletesen sötétíti a képet, színváltozás nélkül."), credit: "Robert Emperley from Strasbourg, Alsace, France / Wikimedia Commons", license: "CC BY-SA 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Neutral_density_filter_demonstration.jpg" },
  ],
  "exposure.tools": [
    { src: "/learn/refs/exposure-tools-1.jpg", alt: b("Tektronix waveform monitor displaying a video signal", "Tektronix waveform monitor videojellel"), caption: b("A waveform monitor shows brightness across the frame from black (bottom) to white (top).", "A waveform monitor a képen át mutatja a fényességet a feketétől (lent) a fehérig (fent)."), credit: "Erreja / Wikimedia Commons", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Tektronix_WFM5200.jpg" },
  ],
  "exposure.intent": [
    { src: "/learn/refs/exposure-intent-1.jpg", alt: b("Low-key profile portrait of a man", "Low key profilportré egy férfiról"), caption: b("Low key: most of the frame falls into shadow; one hard source shapes the profile.", "Low key: a kép nagy része árnyékban; egyetlen kemény forrás formálja a profilt."), credit: "Hden91 / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Matt_Mateiescu_Portrait.jpg" },
    { src: "/learn/refs/exposure-intent-2.jpg", alt: b("Dark low-key portrait with only the face lit", "Sötét low key portré, csak az arc megvilágítva"), caption: b("Exposing for the lit side of the face and letting everything else go black.", "Expozíció az arc megvilágított oldalára, minden más feketébe hagyva."), credit: "Vox Efx from Baltimore, United States / Wikimedia Commons", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Low_key.jpg" },
  ],
  "lenses.dof": [
    { src: "/learn/refs/lenses-dof-1.jpg", alt: b("Portrait of a boy with a softly blurred green background", "Portré egy fiúról lágyan elmosódott zöld háttérrel"), caption: b("Shallow depth of field: the face is sharp, the background melts into bokeh.", "Kis mélységélesség: az arc éles, a háttér bokeh-vá olvad."), credit: "Chokity / Wikimedia Commons", license: "CC BY 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Shallow_Depth_of_Field_with_Bokeh.jpg" },
  ],
  "composition.depth": [
    { src: "/learn/refs/composition-depth-1.jpg", alt: b("Library aisle with shelves converging toward the back", "Könyvtári folyosó, a polcok hátrafelé összetartanak"), caption: b("Converging lines pull the eye deep into the frame.", "Az összetartó vonalak a kép mélyébe vezetik a szemet."), credit: "Mahi zahidi / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Central_library_(Leading_lines).jpg" },
    { src: "/learn/refs/composition-depth-2.jpg", alt: b("Curved station roof receding into the distance", "Íves állomástető, amely a távolba vész"), caption: b("Curves and repetition create depth even in a flat image.", "Az ívek és ismétlődések sík képben is mélységet teremtenek."), credit: "PEPSI697 / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Flagstaff_railway_station_roof_leading_perspectives_at_platform_(15_August_2024).jpg" },
  ],
  "movement.handheld": [
    { src: "/learn/refs/movement-handheld-1.jpg", alt: b("Steadicam operator filming in front of a crowd", "Steadicam-operatőr forgat egy tömeg előtt"), caption: b("A Steadicam lets the operator walk with the action while the image floats.", "A Steadicammel az operatőr együtt mozoghat a cselekménnyel, a kép mégis lebeg."), credit: "Mike1024 / Wikimedia Commons", license: "Public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Steadicam_and_operator_in_front_of_crowd.jpg" },
  ],
  "light.quality": [
    { src: "/learn/refs/light-quality-1.jpg", alt: b("Two studio softboxes on stands", "Két stúdió-softbox állványon"), caption: b("Softboxes make a small lamp into a large source — large source, soft light.", "A softbox a kis lámpából nagy forrást csinál — nagy forrás, lágy fény."), credit: "Katie Chan / Wikimedia Commons", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:PhotoSEL_LS21E52_Softbox_Studio_Lighting_Kit_(2).jpg" },
  ],
  "light.direction": [
    { src: "/learn/refs/light-direction-1.jpg", alt: b("Portrait of a man with Rembrandt lighting", "Férfiportré Rembrandt-világítással"), caption: b("A strong side key: one half of the face is lit, the other falls into shadow.", "Erős oldalsó fő fény: az arc egyik fele világos, a másik árnyékba esik."), credit: "Jacopo188 / Wikimedia Commons", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rembrandt_Lighting.JPG" },
  ],
  "setups.threepoint": [
    { src: "/learn/refs/setups-threepoint-1.jpg", alt: b("Studio set-up seen from behind the subject with three lights", "Stúdióbeállítás a téma mögül, három lámpával"), caption: b("Three-point lighting from behind: key and fill in front, a backlight separates the subject.", "Háromfényes világítás hátulról: fő- és derítőfény elöl, az ellenfény elválasztja a témát."), credit: "SweetCanadianMullet / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Three_point_lighting_back.jpg" },
    { src: "/learn/refs/setups-threepoint-2.jpg", alt: b("Studio set-up seen from the front with the subject seated", "Stúdióbeállítás szemből, ülő témával"), caption: b("The same set-up from the front: notice where each lamp stands.", "Ugyanez a beállítás szemből: figyeld meg, hol áll az egyes lámpa."), credit: "SweetCanadianMullet / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Three_point_lighting_front.jpg" },
    { src: "/learn/refs/setups-threepoint-3.jpg", alt: b("Portrait made with simple three-point lighting", "Egyszerű háromfényes világítással készült portré"), caption: b("The result: a modelled face with a rim of light on the hair.", "Az eredmény: modellált arc, fénykontúr a hajon."), credit: "Robert Judge / Wikimedia Commons", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Portrait_with_simple_three-point_lighting,_by_Robert_Judge.jpg" },
  ],
  "setups.natural": [
    { src: "/learn/refs/setups-natural-1.jpg", alt: b("Black-and-white portrait lit by a north window", "Fekete-fehér portré északi ablakfényben"), caption: b("North-window light: one big soft source, deep shadows, no lamps.", "Északi ablakfény: egyetlen nagy lágy forrás, mély árnyékok, lámpák nélkül."), credit: "Jay DeFehr / Wikimedia Commons", license: "CC BY-SA 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Self_portrait_at_Gild_studio,_North_window_light_Sinar_P,_4x5,_Fujinon_250mm_f-6.3_Pyro-X_1-500,_21C,_21-00,_10_seconds-3-00_agitation_-_Flickr_-_Jay_DeFehr.jpg" },
    { src: "/learn/refs/setups-natural-2.jpg", alt: b("Profile portrait of a man in window light", "Férfi profilportréja ablakfényben"), caption: b("Side light from a window sculpts the face in profile.", "Az ablakból jövő oldalfény formálja a profilt."), credit: "Koen Suyk / Anefo / Wikimedia Commons", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Wessel_Couzijn_(1980).jpg" },
  ],
  "colour.wb": [
    { src: "/learn/refs/colour-wb-1.jpg", alt: b("Comparison of cool and warm colour temperature", "Hideg és meleg színhőmérséklet összehasonlítása"), caption: b("Same image, two white balances: cool (top) and warm (bottom).", "Ugyanaz a kép két fehéregyensúllyal: hideg (fent) és meleg (lent)."), credit: "NASA / Wikimedia Commons", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Blue_Marble_White_Balancing.jpg" },
  ],
  "staging.motivated": [
    { src: "/learn/refs/staging-motivated-1.jpg", alt: b("Director instructing a young actor surrounded by crew", "Rendező instruál egy fiatal színészt a stáb körében"), caption: b("Director Luigi Zampa works with a young actor on set while the crew waits.", "Luigi Zampa rendező egy fiatal színésszel dolgozik a forgatáson, a stáb vár."), credit: "Unknown author / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Photo_Director_Luigi_Zampa_instructs_the_young_actor_Enzo_Stajola_on_what_to_do_in_a_scene_from_La_linea_bianca,_the_working_title_of_the_film_Cuori_senza_frontiere_1950_-_Touring_Club_Italiano_04_0677.jpg" },
  ],
  "shotdesign.whose": [
    { src: "/learn/refs/shotdesign-whose-1.jpg", alt: b("Hand-drawn storyboard page with six panels", "Kézzel rajzolt, hatkockás storyboard-oldal"), caption: b("A hand-drawn storyboard: shot size, action and framing, panel by panel.", "Kézzel rajzolt storyboard: plán, cselekmény és képkivágás kockáról kockára."), credit: "Iván López Fuente / Wikimedia Commons", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Storyboard_-_Iv%C3%A1n_L%C3%B3pez_Fuente.jpg" },
  ],
  "leading.set": [
    { src: "/learn/refs/leading-set-1.jpg", alt: b("Historic film crew around cameras and a sound truck", "Korabeli filmstáb kamerák és hangkocsi körül"), caption: b("A film crew in 1936: camera, sound and director — the same roles as today.", "Filmstáb 1936-ban: kamera, hang és rendező — ugyanazok a szerepek, mint ma."), credit: "Unknown author / Wikimedia Commons", license: "Public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Film_Crew_Sydney_1936_SLNSW_FL990681.jpg" },
  ],
};
