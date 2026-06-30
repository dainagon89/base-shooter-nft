import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['500', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Base Shooter NFT',
  description: '画面をドラッグして敵を撃つシューティングゲーム。ハイスコアでNFTをミントしよう。',
  other: {
    'base:app_id': '6a435e12f20fd3db982cf7d5',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body className="font-display">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
