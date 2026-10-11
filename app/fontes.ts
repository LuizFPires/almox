import { Barlow, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'

export const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

export const barlowCondensada = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const variaveisDeFonte = `${barlow.variable} ${barlowCondensada.variable} ${jetbrainsMono.variable}`
