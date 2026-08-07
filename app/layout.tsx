import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "NOVA — Personal Growth Workspace",
  description: "A calm, intelligent workspace for your everyday growth.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NOVA" },
};

export const viewport: Viewport = { themeColor: "#f6f7f9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><ServiceWorkerRegister />{children}</body></html>;
}
