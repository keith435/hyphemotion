import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyphemotion",
  description: "CRM, chat, and revisions for your animation studio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">
        {children}
      </body>
    </html>
  );
}
