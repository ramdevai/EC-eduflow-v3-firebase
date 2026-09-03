import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/Providers";
import { checkSystemHealth, HealthStatus } from "@/lib/system-health";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

const inter = Inter({ subsets: ["latin"] });
const shouldShowMaintenanceBanner =
  process.env.NEXT_PUBLIC_APP_ENV === "production" &&
  (process.env.VERCEL_GIT_COMMIT_REF || "main") === "main";

export const metadata: Metadata = {
  title: "EduCompass CRM",
  description: "Lead management for career counseling",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let health: HealthStatus = { ok: true };

  if (shouldShowMaintenanceBanner) {
    try {
      health = await checkSystemHealth();
    } catch (err) {
      console.error('Health check failed:', err);
      health = {
        ok: false,
        errorType: 'API_ERROR',
        message: 'System health check encountered an error.'
      };
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors duration-300`}>
        <Providers>
          {!health.ok && health.message && <MaintenanceBanner message={health.message} />}
          {children}
        </Providers>
      </body>
    </html>
  );
}
