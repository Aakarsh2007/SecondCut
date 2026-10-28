import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondCut — A second chance for custom work",
  description: "Recover custom orders through approved replacement sales and verified PayPal sandbox refunds.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
