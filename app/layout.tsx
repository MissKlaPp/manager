"use client"; // Diventa Client Component per gestire i percorsi

import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PinProtection from "./components/PinProtection";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Se l'utente è sulla pagina pubblica "/ordina", non chiediamo il PIN
  const isPublicPage = pathname === "/ordina";

  const Content = (
    <>
      <header className="bg-[#0F5C35] text-white shadow-md print:hidden sticky top-0 z-50 border-b-4 border-[#FDBE15]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white bg-white" />
            <div className="flex flex-col">
              <span className="font-bold text-2xl tracking-wide leading-none">Senza<span className="text-[#FDBE15]">GLÙ</span></span>
              <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">dolce & salato</span>
            </div>
          </Link>
          
          {/* Menu visibile solo allo staff (non nella pagina pubblica) */}
          {!isPublicPage && (
            <nav className="flex gap-4 md:gap-6 font-semibold text-sm md:text-base">
              <Link href="/" className="hover:text-[#FDBE15]">Ordini</Link>
              <Link href="/resoconto" className="hover:text-[#FDBE15]">Resoconto</Link>
              <Link href="/menu" className="hover:text-[#FDBE15]">Menu</Link>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-4 md:p-6 flex-grow">
        {children}
      </main>

      <footer className="bg-[#F17329] text-white text-center py-4 print:hidden mt-auto border-t-4 border-[#0F5C35]">
        <p className="font-bold text-sm md:text-base">Senza<span className="text-[#FDBE15]">GLÙ</span> dolce & salato © {new Date().getFullYear()}</p>
      </footer>
    </>
  );

  return (
    <html lang="it" style={{ colorScheme: "light" }}>
      <body className={`${inter.className} bg-orange-50/30 text-gray-900 flex flex-col min-h-screen`}>
        {isPublicPage ? Content : <PinProtection>{Content}</PinProtection>}
      </body>
    </html>
  );
}