import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "RentFlow | Gestioná tus alquileres",
  description: "Tu asistente financiero para alquileres y roomies",
  manifest: "/manifest.json",
  themeColor: "#0B0E14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${outfit.variable} font-sans bg-[#0B0E14] text-slate-200 antialiased selection:bg-purple-500/30 selection:text-purple-200`}>
        {children}
      </body>
    </html>
  );
}
