import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign Flow - Sistema de Assinatura Digital",
  description: "Sistema de assinatura digital com certificado A1 + Soluti",
  icons: {
    icon: '/assina-flow-icon.png', 
    apple: '/assina-flow-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Validar variável obrigatória em produção
  if (!clerkKey && process.env.NODE_ENV === 'production') {
    console.error('[LAYOUT] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY não configurada');
    // Em produção, ainda assim tentar renderizar, mas logar erro
  }
  
  return (
    <ClerkProvider publishableKey={clerkKey || ""}>
      <html lang="pt-BR" className="dark" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
