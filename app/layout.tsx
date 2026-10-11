import type { Metadata } from 'next'
import { variaveisDeFonte } from './fontes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Almox',
  description: 'Controle de ferramentas do almoxarifado de obra',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${variaveisDeFonte} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
