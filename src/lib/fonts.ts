import localFont from "next/font/local";

// next/font/google's Noto Serif SC build only ships Latin subsets.
// This simplified-Chinese file also covers the site's Latin, so one face stays consistent.
export const siteFont = localFont({
  src: "../../node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Songti SC", "Source Han Serif SC", "serif"],
  preload: true,
});
