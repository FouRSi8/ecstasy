import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomCursor from "../components/CustomCursor";
import Bubbles from "../components/Bubbles";
import Whispers from "../components/Whispers";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ecstasy",
  description: "AI-Powered Color Grading",
};

import { EcstasyProvider } from "../context/EcstasyContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <EcstasyProvider>
          <Bubbles />
          <CustomCursor />
          <Whispers />
          {children}
        </EcstasyProvider>
      </body>
    </html>
  );
}
