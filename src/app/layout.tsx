import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sietrix CRM/ATS",
  description: "Internal CRM & ATS for Sietrix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${jakarta.className} h-full bg-[#060614] text-white antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(15, 15, 40, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
