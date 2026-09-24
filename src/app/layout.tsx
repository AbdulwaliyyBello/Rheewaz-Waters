import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rheewaz Waters",
  description: "Operations, sales, and cash-position dashboard for Rheewaz Waters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
