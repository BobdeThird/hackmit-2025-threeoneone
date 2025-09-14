import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import "mapbox-gl/dist/mapbox-gl.css"

// Using Inter as a close alternative to Chirp with Twitter's font fallbacks
const chirpFont = Inter({
  variable: "--font-chirp",
  subsets: ["latin"],
  display: "swap",
});

// Keep mono font for code elements
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThreeOneOne - City Issues Platform",
  description: "Report and discuss city issues with your community",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-chirp ${chirpFont.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
