import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Universal Social Media Downloader",
  description: "Download videos, audio, and images from supported platforms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
