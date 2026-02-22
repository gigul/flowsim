import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowSim — Симулятор бизнес-процессов',
  description: 'Моделирование и дискретно-событийная симуляция процессов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
