import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { OfflineSync } from "@/components/offline-sync";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KartTrack",
  description: "Karting-Daten tracken, mit Freunden vergleichen, Belohnungen holen.",
  appleWebApp: { capable: true, title: "KartTrack", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 pb-16 text-neutral-100">
        {children}
        <Suspense fallback={null}>
          <Nav />
        </Suspense>
        <OfflineSync />
        <SwRegister />
      </body>
    </html>
  );
}
