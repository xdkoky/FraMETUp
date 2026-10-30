/**
 * Academic calendar helpers. Hungarian academic years start in September; the
 * spring semester starts in February. Semester 1 = autumn of the enrollment year.
 */

export function semesterForDate(enrollmentYear: number, date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const academicStart = m >= 8 ? y : y - 1; // Sep–Dec → this year; Jan–Aug → previous
  const yearIndex = academicStart - enrollmentYear; // 0 = first year
  const inSpring = m >= 1 && m <= 7;
  return Math.max(1, yearIndex * 2 + (inSpring ? 2 : 1));
}

/** Inclusive start and exclusive end of a semester. */
export function semesterRange(enrollmentYear: number, semester: number): { start: Date; end: Date } {
  const yearIndex = Math.floor((semester - 1) / 2);
  const autumn = semester % 2 === 1;
  const startYear = enrollmentYear + yearIndex;
  return autumn
    ? { start: new Date(startYear, 8, 1), end: new Date(startYear + 1, 1, 1) }
    : { start: new Date(startYear + 1, 1, 1), end: new Date(startYear + 1, 8, 1) };
}

export function semesterLabel(enrollmentYear: number | null, semester: number): string {
  const yearNo = Math.floor((semester - 1) / 2) + 1;
  const term = semester % 2 === 1 ? "Autumn" : "Spring";
  if (!enrollmentYear) return `Year ${yearNo} · ${term}`;
  const start = enrollmentYear + yearNo - 1;
  return `Year ${yearNo} · ${term} ${semester % 2 === 1 ? start : start + 1}`;
}
