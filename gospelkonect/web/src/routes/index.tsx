import { createFileRoute } from '@tanstack/react-router'
import { AppCta, Faq, Features, FeedPreview, Footer, Header, Hero, HowItWorks, Safety, Stories } from '../components/landing'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="min-h-screen bg-alabaster font-body text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cerulean focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <FeedPreview />
        <Features />
        <HowItWorks />
        <Stories />
        <Safety />
        <AppCta />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
