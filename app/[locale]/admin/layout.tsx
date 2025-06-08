"use client";

import "@/styles/globals.css";
import { Session } from "next-auth";

import { SessionProvider } from "next-auth/react";

export default function AdminLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
