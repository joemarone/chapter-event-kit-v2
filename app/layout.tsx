import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chapter Event Kit — Alpha Anywhere',
  description: 'A parent-organizer tool for running workshops in Alpha Anywhere Community Chapters. Pick a workshop, fill in a few details, and walk away with everything you need.',
  openGraph: {
    title: 'Chapter Event Kit',
    description: 'Pick a workshop. Get a kit. Run the event.',
    images: ['/brand/og-default.png']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
