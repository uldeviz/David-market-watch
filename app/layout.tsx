import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Watch — Gold & Macro News Radar",
  description: "Monitoraggio in tempo reale delle notizie che muovono oro, dollaro e rendimenti USA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-theme="dark">
      <body className="min-h-screen bg-surface-page">{children}</body>
    </html>
  );
}
