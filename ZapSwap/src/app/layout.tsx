import '../styles/globals.css';
import { Inter } from 'next/font/google';
import ClientLayout from './client-layout';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ZapSwap - Fast, secure, and low-fee token swaps on MegaETH',
  description: 'Swap tokens on the MegaETH network with singleton pools',
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'apple-touch-icon', url: '/favicon.ico' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
