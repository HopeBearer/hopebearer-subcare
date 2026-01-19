import type { Metadata } from "next";
import './globals.scss'

export const metadata: Metadata = {
  title: "SubCare - Subscription Management",
  description: "Manage your subscriptions efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );  
}
