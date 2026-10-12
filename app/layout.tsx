import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/state/Theme";
import Shell from "@/components/Shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SYYH / SIGNAL", template: "%s — SYYH Signal" },
  description: "接通信号，探索四座悬浮岛。SYYH 个人频道的第一版设计 draft。",
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
