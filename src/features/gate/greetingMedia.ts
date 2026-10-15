import type { Theme } from "@/lib/contracts";
import { avatarArt } from "@/lib/v2-assets";

export const GREETING_TIMEOUT_MS = 8000;
export const REDUCED_HOLD_MS = 900;
export const DEGRADE_HOLD_MS = 1000;

export type GreetingReason = "ended" | "error" | "abort" | "timeout" | "reduced" | "skip";

export type GreetingSources = {
  theme: Theme;
  portrait: boolean;
  video: string;
  webm: string;
  poster: string;
};

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "day" ? "day" : "night";
}

export function readPortrait() {
  return window.matchMedia("(orientation: portrait)").matches;
}

export function greetingSources(theme: Theme, portrait: boolean): GreetingSources {
  return {
    theme,
    portrait,
    video: avatarArt.greeting(theme, portrait),
    webm: avatarArt.greetingWebM(theme, portrait),
    poster: avatarArt.greetingPoster(theme, portrait),
  };
}

export function releaseVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
  video.load();
}
