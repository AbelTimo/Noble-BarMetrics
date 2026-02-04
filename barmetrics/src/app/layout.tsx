import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import { NavHeader } from "@/components/nav-header";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BarMetrics - Bar Inventory Management",
  description: "Bar inventory management using bottle weight to estimate remaining liquor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${raleway.variable} antialiased min-h-screen font-raleway`}
      >
        <Providers>
          <NavHeader />
          <main className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
          <Toaster position="bottom-center" richColors closeButton={false} expand={false} visibleToasts={1} />
        </Providers>
      </body>
    </html>
  );
}
