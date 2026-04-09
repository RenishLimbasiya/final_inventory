import type { Metadata } from "next";
import { Providers } from "./providers";
import { DashboardLayout } from "@/components/layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory Management System",
  description:
    "Professional inventory management dashboard with real-time tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <DashboardLayout>{children}</DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}
