import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { webData } from "../constants/webData";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationProvider";
import { ToastProvider } from "../Components/toast/ToastProvider";
import { ToastContainer } from "../Components/toast";
import MainContent from "./MainContent";
import LenisProvider from "@/Components/LenisProvider";
import BackgroundOrbs from "@/Components/BackgroundOrbs";
import ProgressBar from "@/Components/ProgressBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins" 
});

export const metadata: Metadata = {
  title: `${webData.websiteName} | Portfolio`,
  description: webData.hero.subheading,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth custom-scrollbar">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans bg-background text-foreground antialiased min-h-screen flex flex-col`}
      >
        <LenisProvider>
          <ProgressBar />
          <BackgroundOrbs />
          <NotificationProvider>
            <AuthProvider>
              <ToastProvider>
                <MainContent>
                  {children}
                </MainContent>
                <ToastContainer />
              </ToastProvider>
            </AuthProvider>
          </NotificationProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
