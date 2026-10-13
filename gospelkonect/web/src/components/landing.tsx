import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowRight,
  AudioLines,
  Bell,
  BookOpen,
  Flame,
  HandHeart,
  Heart,
  MessageCircle,
  Play,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button, Card, Chip, PrayerBadge, SectionHeading } from './ui'
import { CountUp, Reveal } from './motion'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/* ---------------- Header ---------------- */

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-alabaster/85 shadow-sheet backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5" aria-label="GospelKonect home">
          <img src="/logo.png" alt="GospelKonect logo" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-[17px] font-bold tracking-tight text-ink">
            GospelKonect
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-[15px] font-medium text-ink/80 md:flex" aria-label="Primary">
          <a className="transition-colors hover:text-cerulean" href="#feed">Fellowship</a>
          <a className="transition-colors hover:text-cerulean" href="#features">Features</a>
          <a className="transition-colors hover:text-cerulean" href="#stories">Stories</a>
          <a className="transition-colors hover:text-cerulean" href="#safety">Safety</a>
          <a className="transition-colors hover:text-cerulean" href="#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <a
            href="#app"
            className="hidden min-h-[44px] items-center rounded-full px-4 font-display text-sm font-semibold text-ink transition-colors hover:bg-sunken sm:inline-flex"
          >
            Sign in
          </a>
          <Button href="#app" className="min-h-[44px] px-5 text-sm">
            Join fellowship <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ---------------- Hero ---------------- */

export function Hero() {
  const root = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced || !root.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero="badge"]', { opacity: 0, y: 12, duration: 0.4 })
        .from('[data-hero="title"] .word', { opacity: 0, y: 26, duration: 0.6, stagger: 0.06 }, '-=0.15')
        .from('[data-hero="copy"]', { opacity: 0, y: 14, duration: 0.5 }, '-=0.3')
        .from('[data-hero="cta"]', { opacity: 0, y: 14, duration: 0.45 }, '-=0.3')
        .from('[data-hero="proof"]', { opacity: 0, y: 12, duration: 0.45 }, '-=0.3')
        .from('[data-hero="phone"]', { opacity: 0, y: 32, scale: 0.97, duration: 0.8 }, '-=0.7')
        .from('[data-hero="float"]', { opacity: 0, y: 16, duration: 0.5, stagger: 0.12 }, '-=0.4')
      gsap.to('[data-hero="orb"]', {
        y: -18,
        duration: 3.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section id="top" ref={root} className="relative overflow-hidden pt-28 sm:pt-36">
      <div
        data-hero="orb"
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-lavender blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-160px] left-[-140px] h-[380px] w-[380px] rounded-full bg-sungold/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
        <div>
          <div data-hero="badge" className="flex flex-wrap items-center gap-2">
            <PrayerBadge count="2,418" />
            <Chip active>Testimonies</Chip>
            <Chip>Prayer</Chip>
            <Chip>Devotionals</Chip>
          </div>
          <h1
            data-hero="title"
            className="mt-6 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.02em] text-ink sm:text-6xl"
          >
            {['A', 'still', 'place', 'for', 'prayer', 'and', 'fellowship.'].map((w) => (
              <span key={w} className="word mr-3 inline-block">
                {w}
              </span>
            ))}
          </h1>
          <p data-hero="copy" className="mt-5 max-w-xl text-[17px] leading-7 text-muted">
            GospelKonect brings prayer requests, testimonies, devotionals and scripture into one
            calm feed. No noise, no outrage loops. Just people carrying one another in faith.
          </p>
          <div data-hero="cta" className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="#app">
              <HandHeart size={17} aria-hidden="true" /> Start praying together
            </Button>
            <Button href="#feed" variant="ghost">
              <Play size={16} aria-hidden="true" /> See the fellowship
            </Button>
          </div>
          <dl data-hero="proof" className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              { v: 2418, s: '+', label: 'prayers lifted' },
              { v: 312, s: '', label: 'answered this month' },
              { v: 96, s: '%', label: 'report more peace' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-2xl font-bold text-cerulean">
                  <CountUp to={s.v} suffix={s.s} />
                </dd>
                <dd className="mt-1 text-[13px] leading-4 text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-hero="phone" className="relative mx-auto w-full max-w-[380px]">
          <div className="rounded-hero border border-line bg-white p-4 shadow-sheet">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cerulean font-display text-sm font-bold text-white">
                G
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold text-ink">Grace M.</p>
                <p className="text-[13px] text-muted">New Life Fellowship · 2h</p>
              </div>
              <span className="ml-auto rounded-full bg-prayer-bg px-2.5 py-1 text-[11px] font-semibold text-prayer-ink">
                Answered
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-6 text-ink">
              My mother is home from hospital. Thank you to everyone who prayed through the night
              with us.
            </p>
            <figure className="mt-3 rounded-xl border border-line bg-alabaster p-3">
              <blockquote className="font-body text-[14px] italic leading-6 text-ink">
                “The prayer of a righteous person is powerful and effective.”
              </blockquote>
              <figcaption className="mt-1 text-[12px] font-medium text-muted">
                James 5:16
              </figcaption>
            </figure>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13px] font-medium">
              <span className="inline-flex items-center gap-1.5 text-sungold">
                <Flame size={15} aria-hidden="true" /> 214 Amen
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose">
                <Heart size={15} aria-hidden="true" /> 96
              </span>
              <span className="inline-flex items-center gap-1.5 text-cerulean">
                <MessageCircle size={15} aria-hidden="true" /> 31
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Share2 size={15} aria-hidden="true" /> Share
              </span>
            </div>
          </div>
          <div
            data-hero="float"
            className="absolute -left-6 top-10 hidden rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-card sm:block"
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-cerulean">
              <Bell size={14} aria-hidden="true" /> Prayer circle live
            </p>
            <p className="text-[12px] text-muted">18 friends praying now</p>
          </div>
          <div
            data-hero="float"
            className="absolute -right-4 bottom-12 hidden rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-card sm:block"
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-prayer-ink">
              <Sparkles size={14} aria-hidden="true" /> Morning devotional ready
            </p>
            <p className="text-[12px] text-muted">Psalm 23 · 4 min listen</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Feed preview ---------------- */

const FEED = [
  {
    name: 'Pastor Daniel K.',
    meta: 'Grace City Church · 1h',
    tag: 'Prayer request',
    tagLive: true,
    body: 'Join me at 6am as we lift up families starting the school term. Drop your names below and we will call each one out.',
    verse: null as null | { text: string; ref: string },
    amen: 342,
    love: 58,
    comments: 84,
  },
  {
    name: 'Sarah A.',
    meta: 'Hope Fellowship · 3h',
    tag: 'Testimony',
    tagLive: false,
    body: 'Two years of waiting, and today I signed my nursing license. God kept every promise in the waiting room.',
    verse: { text: '“Wait for the Lord; be strong and take heart.”', ref: 'Psalm 27:14' },
    amen: 518,
    love: 203,
    comments: 47,
  },
  {
    name: 'Emmanuel O.',
    meta: 'New Wine Assembly · 5h',
    tag: 'Scripture',
    tagLive: false,
    body: 'Reading Romans 8 together this week. Day 3 notes are in the comments. Who is joining the evening study?',
    verse: { text: '“In all things God works for the good of those who love him.”', ref: 'Romans 8:28' },
    amen: 189,
    love: 74,
    comments: 112,
  },
]

export function FeedPreview() {
  return (
    <section id="feed" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="The fellowship feed"
          title="One calm timeline for prayer, word and witness"
          copy="Follow churches and friends, filter by topic, and respond the way faith responds: Amen, Prayed, Blessed, or a word of encouragement."
        />
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {FEED.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.06}>
            <Card className="flex h-full flex-col p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender-soft font-display text-sm font-bold text-cerulean">
                  {p.name.charAt(0)}
                </span>
                <div>
                  <p className="font-display text-[15px] font-semibold">{p.name}</p>
                  <p className="text-[13px] text-muted">{p.meta}</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-6">{p.body}</p>
              {p.verse ? (
                <figure className="mt-3 rounded-xl border border-line bg-alabaster p-3">
                  <blockquote className="text-[14px] italic leading-6">{p.verse.text}</blockquote>
                  <figcaption className="mt-1 text-[12px] font-medium text-muted">{p.verse.ref}</figcaption>
                </figure>
              ) : null}
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[13px] font-medium">
                <span className="inline-flex items-center gap-1.5 text-sungold">
                  <Flame size={15} aria-hidden="true" /> {p.amen}
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose">
                  <Heart size={15} aria-hidden="true" /> {p.love}
                </span>
                <span className="inline-flex items-center gap-1.5 text-cerulean">
                  <MessageCircle size={15} aria-hidden="true" /> {p.comments}
                </span>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Features ---------------- */

const FEATURES = [
  {
    icon: HandHeart,
    title: 'Prayer that is seen and answered',
    copy: 'Post a need in seconds, gather a circle, and mark it answered so the whole fellowship can rejoice with you.',
    accent: 'text-sungold',
  },
  {
    icon: BookOpen,
    title: 'Devotionals and scripture reading',
    copy: 'Morning readings with generous line length, audio listen-along, and progress that respects a reflective pace.',
    accent: 'text-cerulean',
  },
  {
    icon: Users,
    title: 'Churches and circles you trust',
    copy: 'Follow your church, join small circles, and keep your home timeline personal with a real follow graph.',
    accent: 'text-olive',
  },
  {
    icon: AudioLines,
    title: 'Listen on the go',
    copy: 'Four-minute audio devotionals with a clear scrubber for commutes, chores and quiet walks.',
    accent: 'text-cerulean',
  },
  {
    icon: Bell,
    title: 'Gentle notifications only',
    copy: 'Prayer replies, Amen gatherings and circle invites. Batched, quiet hours respected, never noisy.',
    accent: 'text-sungold',
  },
  {
    icon: ShieldCheck,
    title: 'Guarded with care',
    copy: 'Blocking, reporting and pastoral moderation keep testimony threads safe for every generation.',
    accent: 'text-prayer-ink',
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Why it feels different"
            title="Built for reverence, not for rage-clicks"
            copy="Every pattern comes from the mobile fellowship: generous space, warm surfaces, and actions that bless instead of bait."
          />
        </Reveal>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06}>
              <div>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alabaster ${f.accent}`}>
                  <f.icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-muted">{f.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- How it works + stories ---------------- */

export function HowItWorks() {
  const steps = [
    { n: '01', t: 'Join your fellowship', c: 'Create an account, follow your church and two friends. Your timeline becomes yours.' },
    { n: '02', t: 'Share or lift a prayer', c: 'Post a need, an Amen, or a testimony. Scripture and media attach in one tap.' },
    { n: '03', t: 'Return and rejoice', c: 'Get gentle updates, mark prayers answered, and celebrate what God has done.' },
  ]
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From quiet signup to shared Amen in minutes"
          />
          <div className="mt-8">
            <Button href="#app">
              Begin with prayer <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </Reveal>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <li className="flex gap-5 rounded-card border border-line bg-white p-5 shadow-card">
                <span className="font-display text-sm font-bold text-sungold">{s.n}</span>
                <div>
                  <h3 className="font-display text-[16px] font-semibold">{s.t}</h3>
                  <p className="mt-1 text-[15px] leading-6 text-muted">{s.c}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

const QUOTES = [
  { q: 'I posted at midnight. By morning, forty people had prayed by name.', n: 'Miriam T.', r: 'Lagos' },
  { q: 'Our youth group finally has a feed parents trust.', n: 'Pastor Joe', r: 'Nairobi' },
  { q: 'The devotional audio carries my commute now.', n: 'Anna K.', r: 'Accra' },
  { q: 'Answered prayers are pinned in our church. Faith keeps rising.', n: 'Elder Sam', r: 'Kumasi' },
  { q: 'Calm, kind, and unhurried. Nothing else feels like this.', n: 'Ruth E.', r: 'London' },
  { q: 'Grief shared here met gentleness, never gossip.', n: 'Deborah W.', r: 'Abuja' },
]

export function Stories() {
  return (
    <section id="stories" className="scroll-mt-20 overflow-hidden border-y border-line bg-lavender-soft/60 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading eyebrow="Stories" title="Witnesses from the fellowship" />
        </Reveal>
      </div>
      <div className="marquee mt-10" role="region" aria-label="Testimonies from members">
        <div className="marquee-track flex w-max gap-4 pr-4">
          {[...QUOTES, ...QUOTES].map((t, i) => (
            <figure
              key={`${t.n}-${i}`}
              className="w-[320px] shrink-0 rounded-card border border-line bg-white p-5 shadow-card"
            >
              <Quote size={18} className="text-sungold" aria-hidden="true" />
              <blockquote className="mt-3 text-[15px] leading-6">{t.q}</blockquote>
              <figcaption className="mt-3 text-[13px] font-semibold text-ink">
                {t.n} <span className="font-normal text-muted">· {t.r}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Safety / App / FAQ / Footer ---------------- */

export function Safety() {
  return (
    <section id="safety" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            eyebrow="Safety"
            title="A guarded place for every generation"
            copy="Blocks, reports and review queues run quietly in the background, with rate limits against spam and pastoral oversight for sensitive threads."
          />
          <ul className="mt-6 space-y-3 text-[15px]">
            {['One-tap block and report on every post', 'Answered-prayer pinning, not doom ranking', 'Quiet hours and batched notifications'].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-prayer-ink" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.08}>
          <Card className="p-6">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">
              Community promise
            </p>
            <p className="mt-3 font-display text-2xl font-bold leading-snug">
              “Speak truth in love. Carry one another. Leave no prayer unanswered in silence.”
            </p>
            <p className="mt-4 text-[15px] leading-6 text-muted">
              Moderators are members first: they pray, they encourage, and they protect the stillness
              that makes this fellowship different.
            </p>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}

export function AppCta() {
  return (
    <section id="app" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-hero bg-cerulean px-6 py-12 text-white sm:px-12 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-sungold-soft">
                Get the app
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
                Carry prayer in your pocket.
              </h2>
              <p className="mt-3 max-w-lg text-[16px] leading-7 text-white/80">
                Start on mobile with the GospelKonect fellowship, then return here for stories,
                devotionals and church life on the big screen.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#top"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 font-display text-[15px] font-semibold text-cerulean transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Join the fellowship <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a
                  href="#feed"
                  className="inline-flex min-h-[48px] items-center rounded-full border border-white/30 px-6 font-display text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore the feed
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-card bg-white/10 p-5 backdrop-blur">
              <img src="/logo.png" alt="GospelKonect app icon" className="h-16 w-16 rounded-2xl bg-white object-cover" />
              <div>
                <p className="font-display text-[16px] font-bold">GospelKonect</p>
                <p className="text-[14px] text-white/75">iOS and Android · Free</p>
                <p className="mt-1 text-[13px] text-white/60">Your church invite link works at signup.</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const FAQS = [
  {
    q: 'Is GospelKonect a church or a social app?',
    a: 'Both, gently. It is a fellowship feed where churches, circles and friends share prayer, scripture and testimony — without the noise of a general network.',
  },
  {
    q: 'How do prayer requests work?',
    a: 'Post a need, gather a praying circle, receive Amens and encouragements, then mark it answered so the fellowship can celebrate with you.',
  },
  {
    q: 'Can I use it with my church only?',
    a: 'Yes. Follow just your church and your circles to keep a quiet, trusted timeline, or open up to the wider fellowship when you are ready.',
  },
  {
    q: 'Is it safe for youth and elders?',
    a: 'Blocking, reporting, quiet hours and pastoral moderation are built in. Touch targets stay large, text stays legible, and motion respects reduced-motion settings.',
  },
  {
    q: 'Does the web replace the mobile app?',
    a: 'No. Mobile carries daily prayer and devotionals; this web view welcomes newcomers, shares stories, and points you into the fellowship.',
  },
]

export function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
      <Reveal>
        <SectionHeading eyebrow="Questions" title="Asked with care" />
      </Reveal>
      <div className="mt-8 space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className="rounded-card border border-line bg-white shadow-card">
                <button
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-display text-[15px] font-semibold"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  {f.q}
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-lg transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                  >
                    +
                  </span>
                </button>
                {isOpen ? <p className="px-5 pb-5 text-[15px] leading-6 text-muted">{f.a}</p> : null}
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="GospelKonect logo" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="font-display text-[15px] font-bold">GospelKonect</p>
            <p className="text-[13px] text-muted">A still place for prayer and fellowship.</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-ink/75" aria-label="Footer">
          <a className="hover:text-cerulean" href="#feed">Fellowship</a>
          <a className="hover:text-cerulean" href="#features">Features</a>
          <a className="hover:text-cerulean" href="#stories">Stories</a>
          <a className="hover:text-cerulean" href="#safety">Safety</a>
          <a className="hover:text-cerulean" href="#faq">FAQ</a>
        </nav>
        <p className="text-[13px] text-muted">© 2026 GospelKonect. Grace and peace.</p>
      </div>
    </footer>
  )
}
