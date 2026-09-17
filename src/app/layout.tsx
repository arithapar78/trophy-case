import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trophy Case",
  description: "Snap a photo. Save the win. Build your timeline.",
  // Tells iOS to run this without Safari's address bar once it's on the
  // Home Screen, which is what makes it feel like a real app.
  appleWebApp: {
    capable: true,
    title: "Trophy Case",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // themeColor lives here, not in metadata — that moved in Next.js 14.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
  width: "device-width",
  initialScale: 1,
  // Stops iOS zooming in when you tap a text box, and stops pinch-zoom
  // wrecking the layout. Safe here because every tap target is finger-sized.
  maximumScale: 1,
  userScalable: false,
  // Let the app paint under the notch and the home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-app text-app antialiased">{children}</body>
    </html>
  );
}
