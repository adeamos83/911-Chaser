import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "911 Chaser",
  description: "Spec the 991 or 992 Porsche 911 you want, compare dealer asking prices against an estimated market value, and find the listings priced under it.",
};

/** The root page shell: loads the Figtree font. Each page draws its own navigation. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
