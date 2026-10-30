import localFont from "next/font/local";

// LXGW WenKai, weight 500, subset to Latin, punctuation, and GB2312.
// The full face is about 7MB; this cut is the readable handwritten text for the site.
export const siteFont = localFont({
  src: "../fonts/lxgw-wenkai-500.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Kaiti SC", "KaiTi", "STKaiti", "serif"],
  preload: true,
});
