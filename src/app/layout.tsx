import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import SwRegister from "./sw-register";

export const metadata: Metadata = {
  title: "PRESTIJ 4 MOE Hub",
  description: "PRESTIJ Cohort 4, Ministry of Education — Project Locker platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PRESTIJ 4 MOE Hub",
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
