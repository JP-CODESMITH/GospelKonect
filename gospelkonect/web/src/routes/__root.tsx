import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { ReactNode } from 'react'

import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import appCss from '../styles.css?url'
import { AuthProvider } from '../lib/auth'
import { ThemeProvider } from '../store/theme'
import { PlayerProvider } from '../store/player'
import { ToastProvider } from '../components/ui'

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('gk.theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      {
        name: 'description',
        content:
          'GospelKonect is a calm fellowship for gospel music, sermons, churches, events, prayer and community. Worship anywhere, find your church family, and never miss a gathering.',
      },
      { name: 'theme-color', content: '#FBF7F0' },
      { property: 'og:title', content: 'GospelKonect — Worship, Community and Fellowship' },
      {
        property: 'og:description',
        content:
          'Gospel music, sermons, churches, events, prayer and community in one warm, reverent place.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: 'GospelKonect — Worship, Community and Fellowship' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/logo.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <PlayerProvider>{children}</PlayerProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
