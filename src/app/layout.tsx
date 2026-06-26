import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ARIA HMS — Hospitality Management System",
  description: "Enterprise-grade hospitality management system · Reservations, Front Office, Housekeeping, F&B POS, Billing, Night Audit & Analytics",
  keywords: ["HMS", "PMS", "Hospitality", "Hotel Management", "Reservations", "POS", "Night Audit"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} antialiased bg-background text-foreground font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <SonnerToaster richColors position="top-right" />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
