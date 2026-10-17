import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ThemeProvider } from "@/state/Theme";
import Shell from "@/components/Shell";
import { siteName, siteDescription, siteUrl } from "@/lib/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: "%s · SYYH" },
  description: siteDescription,
  icons: { icon: "/icon.svg" },
  openGraph: { title: siteName, description: siteDescription, locale: "zh_CN", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Luqing与Jiao，并肩也较量" }] },
  twitter: { card: "summary_large_image", title: siteName, description: siteDescription, images: ["/og-image.jpg"] },
  robots: { index: true, follow: true },
};
export const dynamic = "force-dynamic";
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
const themeInit =
  "try{var t=localStorage.getItem('syyh-theme');document.documentElement.dataset.theme=t==='day'?'day':'night'}catch(e){}";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="zh-CN" data-theme="night" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
