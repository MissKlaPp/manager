import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestionale Bakery',
    short_name: 'BakeryApp',
    description: 'Gestione ordini e clienti',
    start_url: '/',
    display: 'standalone', // È questo il comando che nasconde la barra del browser!
    background_color: '#ffffff',
    theme_color: '#2563eb', // Il colore blu dei nostri pulsanti
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}