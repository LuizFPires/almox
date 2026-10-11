import type { Metadata, Viewport } from 'next'
import { RegistrarServiceWorker } from '@/components/RegistrarServiceWorker'
import { variaveisDeFonte } from './fontes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Almox',
  description: 'Controle de ferramentas do almoxarifado de obra',
  applicationName: 'Almox',
  appleWebApp: { capable: true, title: 'Almox', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#1C1B19',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${variaveisDeFonte} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  )
}
