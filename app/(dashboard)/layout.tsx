import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/Providers";
import { checkSystemHealth } from "@/lib/system-health";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduCompass CRM",
  description: "Lead management for career counseling",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const health = await checkSystemHealth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors duration-300`}>
        <Providers>
          {!health.ok && <MaintenanceBanner message={health.message!} />}
          {children}
        </Providers>
      </body>
    </html>
  );
}
