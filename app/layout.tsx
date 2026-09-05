import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Opportune — AI-Powered Opportunity Finder",
  description:
    "Discover hackathons, research programs, fellowships, and competitions tailored to your profile. Track applications and never miss a deadline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes onto <body> before hydration; without this, every page
          logs a false-positive hydration mismatch in dev. */}
      <body
        suppressHydrationWarning
        className="min-h-screen font-sans antialiased"
      >
        {children}
      </body>
    </html>
  );
}
