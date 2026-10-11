import { JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

/** Inter Variable do Almox Design System (licença SIL OFL em app/fontes/OFL-Inter.txt). */
export const inter = localFont({
  src: './fontes/InterVariable.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
})

/** Códigos internos das unidades (PA-05, MT-02). */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const variaveisDeFonte = `${inter.variable} ${jetbrainsMono.variable}`
