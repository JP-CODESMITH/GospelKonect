import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

let registered = false
let refreshed = false
function ensureGsap() {
  if (typeof window === 'undefined') return
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  // Fonts, images and the marquee change layout height after mount, which
  // leaves trigger start positions stale. Refresh once the page settles.
  if (!refreshed) {
    refreshed = true
    const settle = () => ScrollTrigger.refresh()
    window.addEventListener('load', settle)
    window.setTimeout(settle, 600)
  }
}

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced || !ref.current) return
    ensureGsap()
    const el = ref.current
    // Play once and stay revealed. `reverse` would re-hide content on
    // scroll-up, which leaves the page blank when captured at the top.
    const tween = gsap.from(el, {
      opacity: 0,
      y,
      duration: 0.55,
      delay,
      ease: 'power1.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
      gsap.set(el, { clearProps: 'opacity,transform' })
    }
  }, [reduced, delay, y])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export function CountUp({
  to,
  suffix = '',
  className,
}: {
  to: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!ref.current) return
    if (reduced) {
      ref.current.textContent = `${to.toLocaleString()}${suffix}`
      return
    }
    ensureGsap()
    const obj = { v: 0 }
    const tween = gsap.to(obj, {
      v: to,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 92%', once: true },
      onUpdate: () => {
        if (ref.current) ref.current.textContent = `${Math.round(obj.v).toLocaleString()}${suffix}`
      },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [to, suffix, reduced])

  return (
    <span ref={ref} className={className}>
      {reduced ? `${to.toLocaleString()}${suffix}` : `0${suffix}`}
    </span>
  )
}
