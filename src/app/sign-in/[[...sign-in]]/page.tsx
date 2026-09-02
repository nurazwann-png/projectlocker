"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <SignIn />

      {/* Admin access link below the Clerk card */}
      <Link
        href="/admin"
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124,58,237,0.2)",
          color: "#7c3aed",
          textDecoration: "none",
          boxShadow: "0 2px 12px rgba(124,58,237,0.1)",
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
        </svg>
        Admin access
      </Link>
    </div>
  );
}
