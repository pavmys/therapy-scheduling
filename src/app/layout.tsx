import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// Шрифти — з DESIGN.md (розділ 3): Inter — інтерфейс, Manrope — лише заголовки.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Командний проєкт",
  description: "Next.js + Supabase + OpenSpec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
