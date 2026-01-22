import { Geist, Geist_Mono  } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "doctor appointment",
  description: "connect this doctors anytime ,  anywhere",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header/>

          <main className="min-h-screen">

        {children}
        </main>
        <Toaster richColors/>


        <footer className="bg-muted/50 py-12" >
          <div className="container mx-auto px-4 text-center ">
            <p>
              footer componnt
            </p>
          </div>
        </footer>

        </ThemeProvider>
        
      </body>
    </html>

    </ClerkProvider>
  );
}

