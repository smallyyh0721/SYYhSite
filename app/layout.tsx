import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/state/Theme";
import Shell from "@/components/Shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SYYH", template: "%s — SYYH" },
  description: "SYYH 的个人网站。可以看看四座岛上的作品，也可以留言。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
const themeInit =
  "try{var t=localStorage.getItem('syyh-theme');document.documentElement.dataset.theme=t==='day'?'day':'night'}catch(e){}";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="night" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
