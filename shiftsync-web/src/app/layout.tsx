import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ShiftSync — Workforce Scheduling',
  description: 'Multi-location staff scheduling platform for Coastal Eats',
}

export const viewport: Viewport = {
  themeColor: '#0F172A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[#F8FAFC]`}>
        {children}
      </body>
    </html>
  )
}
