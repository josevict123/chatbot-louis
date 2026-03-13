import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Louis le Raté - Chatbot",
  description: "Chatbot automático de Facebook Messenger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
