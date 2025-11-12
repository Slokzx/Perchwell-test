import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Perchwell · File Explorer Refactor',
  description: 'Diagnose and improve a file explorer experience.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
