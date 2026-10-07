import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Vision Annotator',
  description: 'AI-assisted dataset annotation for computer vision teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
