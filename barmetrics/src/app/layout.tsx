import type { Metadata } from "next";
import { Raleway, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Roman-capitals display face for the Melekyia brand wordmark — echoes the
// engraved lettering inside the logo artwork.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Melekyia - Bar Inventory Management",
  description: "Bar inventory management using bottle weight to estimate remaining liquor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${raleway.variable} ${cinzel.variable}`}>
      <body
        className="antialiased min-h-screen bg-background text-foreground font-sans"
      >
        <Providers>
          {children}
          <Toaster position="bottom-center" richColors closeButton={false} expand={false} visibleToasts={1} />
        </Providers>
      </body>
    </html>
  );
}
