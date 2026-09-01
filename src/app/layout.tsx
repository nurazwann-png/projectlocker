import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import SwRegister from "./sw-register";

export const metadata: Metadata = {
  title: "ProjectLocker",
  description: "Your private vault for tracking and managing deployed projects.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ProjectLocker",
    startupImage: "/icon.jpg",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          {children}
          <SwRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
