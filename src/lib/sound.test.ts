import { describe, expect, it, vi, beforeEach } from "vitest";
import { play, setSoundEnabled, soundEnabled, SOUND_EVENT } from "./sound";

describe("UI sounds", () => {
  beforeEach(() => localStorage.clear());

  it("is on by default and remembers being muted", () => {
    expect(soundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(soundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(soundEnabled()).toBe(true);
  });

  it("tells open switches when the preference changes", () => {
    const seen = vi.fn();
    window.addEventListener(SOUND_EVENT, (e) => seen((e as CustomEvent<boolean>).detail));
    setSoundEnabled(false);
    expect(seen).toHaveBeenCalledWith(false);
  });

  it("never throws, even without Web Audio support", () => {
    expect(() => play("correct")).not.toThrow();
    setSoundEnabled(false);
    expect(() => play("complete")).not.toThrow();
  });
});
