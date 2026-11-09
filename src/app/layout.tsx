import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brisa — O clima, em outra perspectiva.',
  description: 'Um novo jeito de sentir o tempo. Explore o mapa, descubra a previsão, compare cidades e compartilhe seu céu com o Brisa.',
  applicationName: 'Brisa',
  metadataBase: new URL('https://brisa-clima.vercel.app'),
  openGraph: { title: 'Brisa — O clima, em outra perspectiva.', description: 'Seu observatório pessoal. Um mapa, muitos céus e um novo jeito de olhar para o tempo.', locale: 'pt_BR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Brisa — O clima, em outra perspectiva.' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Brisa' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c1117' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
