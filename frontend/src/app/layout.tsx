import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { AppWrapper } from "@/components/layout/AppWrapper";
import { CopilotFloatingWrapper } from "@/components/copilot/CopilotFloatingWrapper";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "XGenius - Fantasy Premier League Optimizer",
  description: "AI-powered FPL optimization platform with ML predictions and squad optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-ai-darker`} style={{ backgroundColor: '#0a0a0a' }}>
        <Providers>
          <AppWrapper>
            <Navbar />
            {children}
            <CopilotFloatingWrapper />
          </AppWrapper>
        </Providers>
      </body>
    </html>
  );
}

