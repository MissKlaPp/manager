import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestionale Bakery",
  description: "Gestione ordini e clienti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* Barra di navigazione per Tablet */}
        <nav className="bg-white shadow-md p-4 mb-6">
          <ul className="flex justify-center space-x-8 text-lg font-semibold">
            <li>
              <Link href="/" className="hover:text-blue-600 text-gray-700">Nuovo Ordine</Link>
            </li>
            <li>
              <Link href="/resoconto" className="hover:text-blue-600 text-gray-700">Resoconto Giornaliero</Link>
            </li>
            <li>
              <Link href="/clienti" className="hover:text-blue-600 text-gray-700">Gestione Clienti</Link>
            </li>
            <li>
              <Link href="/menu" className="hover:text-blue-600 text-gray-700">Gestione Menu</Link>
            </li>
          </ul>
        </nav>
        
        {/* Contenuto della pagina */}
        <main className="max-w-6xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}