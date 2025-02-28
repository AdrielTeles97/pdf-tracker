// app/layout.jsx
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Rastreador de PDF',
  description: 'Sistema de rastreamento de documentos PDF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-blue-600 text-white">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold">PDF-TRACKER</Link>
              <nav>
                <ul className="flex space-x-6">
                  <li>
                    <Link href="/" className="hover:text-blue-200 transition-colors">Dashboard</Link>
                  </li>
                  <li>
                    <Link href="/generate" className="hover:text-blue-200 transition-colors">Gerar PDF</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          <main className="flex-grow bg-gray-100">
            {children}
          </main>

          <footer className="bg-gray-800 text-white py-4">
            <div className="container mx-auto px-4 text-center">
              <p>Sistema de Rastreamento de PDFs © {new Date().getFullYear()}</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}