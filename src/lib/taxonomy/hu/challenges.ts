export interface HuChallenge {
  title: string;
  objective: string;
  resources: string[];
  instructions: string[];
  completionCriteria: string[];
  reflectionQuestions: string[];
  suggestedEvidence: string[];
}

export const CHALLENGES_HU: Record<string, HuChallenge> = {
  "one-take-conflict": {
    title: "Egysnittes konfliktus",
    objective: "Rendezz meg egy kétperces konfliktusjelenetet egyetlen folyamatos beállításban.",
    resources: ["Két színész", "Egy kamera (kézi vagy gimbal)", "Egy szoba legalább két kijárattal"],
    instructions: [
      "Válassz vagy írj egy kétperces jelenetet, amelyben két szereplő összeegyeztethetetlen dolgot akar.",
      "Rajzolj alaprajzot minden színész- és kamerapozícióval.",
      "Próbáld a mozgásrendet előbb kamera nélkül, majd kamerával, amíg a mozgás és a képkivágás rögzül.",
      "Vegyél fel legalább öt teljes felvételt. Felvételen belül nem vághatsz.",
    ],
    completionCriteria: ["Elkészült egy folyamatos kétperces felvétel", "Az alaprajz dokumentálja a színész- és kameramozgást", "Legalább két pillanat, ahol a kameramozgást a konfliktus fordulata motiválja"],
    reflectionQuestions: ["Hol fordult az erőviszony, és hogyan mutatta ezt a mozgásrend?", "Melyik kameramozgás volt a legmotiváltabb, és melyik a legkevésbé?", "Mit kellett feladnod azzal, hogy nem vághattál?"],
    suggestedEvidence: ["A legjobb felvétel (link)", "Alaprajz", "Próbajegyzetek"],
  },
  "silent-emotional-scene": {
    title: "Néma érzelmi jelenet",
    objective: "Közvetítsd egy szereplő érzelmi átalakulását párbeszéd nélkül.",
    resources: ["Egy színész", "Egy helyszín", "Kamera"],
    instructions: [
      "Határozd meg, honnan indul érzelmileg a szereplő, és hová jut.",
      "Keress egy fizikai feladatot, amelyen keresztül a változás megmutatkozhat.",
      "Készíts storyboardot legfeljebb tizenkét beállítással.",
      "Forgasd le, és vágd három perc alá párbeszéd és narráció nélkül.",
    ],
    completionCriteria: ["Egyetlen kimondott szó sincs", "Két tesztnéző le tudja írni az érzelmi változást"],
    reflectionQuestions: ["Melyik kép hordozza a legerősebben a változást?", "Mit kértél a színésztől, hogy csináljon (nem azt, hogy érezzen)?", "Hol értették félre a nézők a jelenetet, és miért?"],
    suggestedEvidence: ["Vágott változat (link)", "Storyboard", "Nézői visszajelzések"],
  },
  "three-interpretations": {
    title: "Három értelmezés",
    objective: "Rendezd meg ugyanazt a rövid párbeszédes jelenetet három érzelmileg különböző módon.",
    resources: ["Két színész", "Egy egyoldalas párbeszédes jelenet", "Kamera vagy telefon"],
    instructions: [
      "Válassz egy semleges, egyoldalas jelenetet kétértelmű párbeszéddel.",
      "Határozz meg három különböző célpárt a szereplőknek.",
      "Minden változatot csak cselekvésekkel és körülményekkel rendezz — eredményinstrukció nélkül.",
      "Minden változatot egy-két beállításban vegyél fel.",
    ],
    completionCriteria: ["Mindhárom változat felvéve", "Minden változat céljai le vannak írva"],
    reflectionQuestions: ["Melyik instrukció változtatta meg leginkább a jelenetet?", "Miben tértek el a színészek ösztönei a tervedtől?", "Melyik változat lepett meg?"],
    suggestedEvidence: ["Három felvétel (linkek)", "Rendezői jegyzetek változatonként"],
  },
  "four-setups": {
    title: "Csak négy beállítás",
    objective: "Fedj le egy háromoldalas jelenetet pontosan négy kamerabeállítással.",
    resources: ["Egy háromoldalas jelenet", "Két-három színész", "Kétfős kamerastáb"],
    instructions: [
      "Bontsd ütemekre a jelenetet, és döntsd el, melyik ütemhez melyik beállítás kell.",
      "Írj felvételi listát négy beállítással, és mindegyiket indokold meg egy mondatban.",
      "Forgass, majd állíts össze egy vágást csak ezekből a beállításokból.",
    ],
    completionCriteria: ["Pontosan négy beállítás", "Elkészült egy teljes összeállítás"],
    reflectionQuestions: ["Melyik beállítás dolgozott a legtöbbet?", "Milyen lefedés hiányzott a vágásban?"],
    suggestedEvidence: ["Felvételi lista", "Összeállított vágás (link)"],
  },
  "paraphrase-rehearsal": {
    title: "Saját szavas próba",
    objective: "Tarts próbát, ahol a színészek csak saját szavaikkal játszhatnak, majd térjetek vissza a szöveghez.",
    resources: ["Két színész", "Egy próbaterem", "Egy sűrű párbeszédes jelenet"],
    instructions: [
      "Tartsatok egy olvasópróbát a szöveggel.",
      "Kérd meg a színészeket, hogy kétszer játsszák el a jelenetet csak saját szavaikkal.",
      "Térjetek vissza a szöveghez, és jegyezd fel, mi változott.",
    ],
    completionCriteria: ["Próbajegyzetek a felfedezésekről"],
    reflectionQuestions: ["Mit fedeztek fel a színészek, amit a szöveg elrejtett?", "Hogyan változtak az instrukcióid a saját szavas játék után?"],
    suggestedEvidence: ["Próbajegyzetek", "Rövid próbafelvétel (hozzájárulással)"],
  },
  "practical-light-night": {
    title: "Csak gyakorlati fények",
    objective: "Világíts meg egy éjszakai belső jelenetet csak a képben látható vagy motivált lámpákkal.",
    resources: ["Háztartási lámpák és izzók", "Kamera", "Egy színész"],
    instructions: [
      "Válassz hangulatot, és írd le egy mondatban.",
      "Vázolj fel világítási tervet csak gyakorlati fényforrásokkal.",
      "Vegyél fel egy rövid pillanatot, és az izzók, pozíciók és ernyők igazításával formáld az arcot.",
    ],
    completionCriteria: ["Világítási terv", "Csak gyakorlati fényekkel készült felvétel"],
    reflectionQuestions: ["Hogyan támogatta a fény a hangulatot?", "Mit változtatnál egy plusz lámpával?"],
    suggestedEvidence: ["Világítási terv", "Képkockák"],
  },
  "scene-autopsy": {
    title: "Jelenetboncolás",
    objective: "Elemezz egy jelenetet beállításonként, majd rendezz egy saját jelenetet annak alapgondolatával.",
    resources: ["Egy általad csodált filmjelenet", "Jegyzetfüzet", "Opcionális: színészek és kamera"],
    instructions: [
      "Sorold fel az összes beállítást plánmérettel, mozgással és hosszal.",
      "Írj egy bekezdést arról, mit csinál a jelenet, és hogyan.",
      "Vonj ki egy elvet, és alkalmazd egy általad rendezett jelenetben.",
    ],
    completionCriteria: ["Beállításonkénti bontás", "Egy saját jelenet, amely alkalmazza az elvet"],
    reflectionQuestions: ["Milyen elvet vontál ki?", "Hogyan alakult át a kezedben?"],
    suggestedEvidence: ["Írásos elemzés", "A saját jeleneted (link)"],
  },
  "sixty-second-pitch": {
    title: "Hatvanmásodperces pitch",
    objective: "Pitcheld a következő projektedet 60 másodpercben három különböző hallgatónak, és finomítsd.",
    resources: ["A projektötleted", "Három hallgató (egyikük ne filmes legyen)"],
    instructions: [
      "Írd meg a pitchet: ki, mit akar, mi áll az útjában, miért te.",
      "Add elő három hallgatónak, és kérd meg mindegyiket, hogy mondja vissza.",
      "Minden előadás után dolgozd át.",
    ],
    completionCriteria: ["Három előadás", "Végleges írásos változat"],
    reflectionQuestions: ["Mit mondtak vissza a hallgatók?", "Mit húztál ki?"],
    suggestedEvidence: ["A pitch szövegváltozatai", "Opcionális felvétel"],
  },
  "colour-script": {
    title: "Színforgatókönyv",
    objective: "Tervezz színprogressziót egy rövidfilmhez, amely követi az érzelmi ívet.",
    resources: ["Forgatókönyv", "Képreferenciák", "Bármilyen dia- vagy kollázskészítő eszköz"],
    instructions: [
      "Oszd fel a filmet öt-nyolc érzelmi szakaszra.",
      "Rendelj palettát mindegyikhez referenciákkal.",
      "Jegyezd fel, hogyan valósítja meg a jelmez, a látvány és a fény az egyes palettákat.",
    ],
    completionCriteria: ["Jegyzetekkel ellátott színforgatókönyv"],
    reflectionQuestions: ["Hol van a legnagyobb színváltás, és miért éppen ott?"],
    suggestedEvidence: ["Színforgatókönyv"],
  },
  "non-actor-portrait": {
    title: "Amatőr szereplős portré",
    objective: "Építs rövid jelenetet egy amatőr szereplő köré, aki olyasmit csinál, amihez valóban ért.",
    resources: ["Egy amatőr szereplő (hozzájárulással)", "A valódi környezete"],
    instructions: [
      "Forgatás előtt figyeld meg az illetőt feladata közben.",
      "Tervezz kis drámai helyzetet a feladat köré.",
      "Forgatás közben csak konkrét fizikai instrukciókat adj.",
    ],
    completionCriteria: ["Aláírt hozzájárulás (offline tárolva)", "Négy percnél rövidebb kész jelenet"],
    reflectionQuestions: ["Mit változtattál a kommunikációs stílusodon?", "Hol tört meg a természetesség?"],
    suggestedEvidence: ["Vágott jelenet (link)", "Reflexió"],
  },
  "plan-b-drill": {
    title: "B-terv gyakorlat",
    objective: "A következő forgatásod előtt tervezz tartalékmegoldást a három legkockázatosabb pillanatodra — és használj fel legalább egyet.",
    resources: ["A forgatási ütemterved"],
    instructions: [
      "Azonosítsd azt a három beállítást vagy jelenetet, amely a legnagyobb eséllyel csúszik el.",
      "Írj mindegyikhez tartalékmegoldást, amely megőrzi a drámai szándékot.",
      "Forgatás után jegyezd fel, melyik tartalékra volt szükséged.",
    ],
    completionCriteria: ["Leírt tartalékmegoldások", "Forgatás utáni jegyzet"],
    reflectionQuestions: ["Melyik kockázatot mérted fel rosszul?", "Megőrizte a tartalékmegoldás a szándékot?"],
    suggestedEvidence: ["Tartalékterv", "Reflexió"],
  },
  "one-rule-film": {
    title: "Egyszabályos film",
    objective: "Készíts egyperces filmet egy olyan formai szabály szerint, amit még soha nem használtál.",
    resources: ["Telefon vagy kamera"],
    instructions: [
      "Válassz szabályt: nincs arc, egy objektív, nincs vágás, csak tükröződések, csak képen kívüli hang…",
      "Készítsd el a filmet egyetlen nap alatt.",
      "Írj három mondatot arról, mit tárt fel a szabály.",
    ],
    completionCriteria: ["Egyperces film", "Háromsoros reflexió"],
    reflectionQuestions: ["Mit kényszerített ki belőled a korlát?"],
    suggestedEvidence: ["Film (link)", "Reflexió"],
  },
  "notes-diet": {
    title: "Instrukciódiéta",
    objective: "Egy próbán vagy forgatáson minden instrukciót egyetlen, cselekvő igét tartalmazó mondatra korlátozz.",
    resources: ["Színészek", "Egy jelenet", "Valami, amiben rögzítheted az instrukcióidat"],
    instructions: [
      "Minden felvétel előtt írd le, milyen instrukciót tervezel adni.",
      "Rövidítsd egy mondatra cselekvő igével („megnyugtatni”, „sarokba szorítani”).",
      "Jegyezd fel, hogyan hatott az egyes instrukció a következő felvételre.",
    ],
    completionCriteria: ["Legalább tíz instrukció és hatásuk naplója"],
    reflectionQuestions: ["Melyik instrukciónak volt a legnagyobb hatása?", "Mikor nem adtál instrukciót, és miért?"],
    suggestedEvidence: ["Instrukciónapló"],
  },
  "information-asymmetry": {
    title: "A közönség tudja",
    objective: "Rendezz egy jelenetet, ahol a közönség tud valamit, amit egy szereplő nem.",
    resources: ["Két színész", "Inzertre alkalmas kellék (levél, telefon, fegyver)"],
    instructions: [
      "Az első 20 másodpercben vizuálisan alapozd meg a rejtett információt.",
      "Játssz egy hétköznapi beszélgetést a rejtett fenyegetés fölött.",
      "Szabályozd, mikor emlékeztetőd a közönséget az információra.",
    ],
    completionCriteria: ["Kész jelenet", "Jegyzetek minden emlékeztető ütemről"],
    reflectionQuestions: ["Hogyan tartottad fenn a feszültséget?", "Hol esett le a feszültség?"],
    suggestedEvidence: ["Jelenet (link)", "Felvételi lista"],
  },
};
