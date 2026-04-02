import type { Metadata } from 'next'
import { DataProvider } from '@/lib/data-context'
import { DataLoader } from '@/components/DataLoader'
import { Navigation } from '@/components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brand Journey Dashboard',
  description: 'Visualize Key Accounts Department and Brand journeys',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <DataProvider>
          <DataLoader>
            <Navigation />
            {children}
          </DataLoader>
        </DataProvider>
      </body>
    </html>
  )
}
