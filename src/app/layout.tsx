import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PWARegister } from "@/components/shared/pwa-register";
import { AuthProvider } from "@/components/shared/auth-provider";

export const metadata: Metadata = {
  title: "Deen X Zikr",
  description: "Modern minimal Islamic spiritual web app for Salah, Quran, Qibla, Hadith, and Daily Zikr.",
  metadataBase: new URL("https://deenxzikr.vercel.app"),
  manifest: "/manifest.webmanifest",
  applicationName: "Deen X Zikr",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Deen X Zikr"
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#121512" }
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ThemeProvider>
            <PWARegister />
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
