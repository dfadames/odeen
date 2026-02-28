import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Odeen – University Voting System',
  description: 'Secure, anonymous, self-hosted voting for university assemblies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
