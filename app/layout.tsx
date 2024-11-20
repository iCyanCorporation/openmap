import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// context files
import { MapContextProvider } from "@/components/context/MapContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "openmap",
  description: "OpenMap is a web platform designed for testing and visualizing map data. Users can upload files containing geographical data and view the information interactively on a map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
      >
        <main>
          <MapContextProvider>
            {children}
          </MapContextProvider>
          </main>
        <Toaster />
      </body>
    </html>
  );
}
