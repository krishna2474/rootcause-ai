import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

// Noto covers Devanagari, so Hindi messages render with the same look as English.
const noto = Noto_Sans({ variable: "--font-noto", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const notoDeva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "RootCause AI",
  description: "An AI teammate that catches payment failures before customers complain, and fixes them with human approval.",
};

export const viewport: Viewport = { themeColor: "#002e6e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${noto.variable} ${notoDeva.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
