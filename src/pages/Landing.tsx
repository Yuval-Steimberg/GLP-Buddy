import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { USE_SUPABASE } from '../lib/env'
import { APP_STORE_URL, PLAY_STORE_URL } from '../constants'
import { Icon, BrandLogo, BrandLockup } from '../components/Icon'

export function Landing() {
  const navigate = useNavigate()
  const { currentUser } = useStore()
  const heroCtaRef = useRef<HTMLDivElement>(null)
  const [showMobileCta, setShowMobileCta] = useState(false)

  const cta = () => {
    if (USE_SUPABASE) return navigate('/auth')
    if (currentUser?.onboardingComplete && !currentUser.acceptedSafety) navigate('/safety')
    else navigate('/onboarding')
  }
  const scrollTo = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => {
    const heroCta = heroCtaRef.current
    if (!heroCta) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowMobileCta(!entry.isIntersecting),
      { threshold: 0.2 },
    )
    observer.observe(heroCta)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="lp">
      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-nav-in">
          <div className="lp-brand">
            <BrandLockup height={58} />
          </div>
          <nav className="lp-nav-links">
            <a onClick={scrollTo('how')}>How it works</a>
            <a onClick={scrollTo('features')}>Features</a>
            <a onClick={scrollTo('voices')}>Community</a>
            <a onClick={scrollTo('faq')}>FAQ</a>
          </nav>
          <button className="lp-btn lp-btn-sm lp-nav-cta" onClick={cta}>
            {USE_SUPABASE ? 'Sign in' : 'Get started'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-glow lp-glow-a" />
        <div className="lp-glow lp-glow-b" />
        <div className="lp-hero-in">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow"><span className="lp-dot" /> Private 1:1 support, matched to you</div>
            <h1 className="lp-h1">Meet the one person who <span className="lp-em">gets your GLP‑1 journey</span>.</h1>
            <p className="lp-lead">
              In about two minutes, meet a private pen pal on the same medication, stage and goals.
              Someone to celebrate the wins and understand the rough weeks.
            </p>
            <div className="lp-cta-row" ref={heroCtaRef}>
              <button className="lp-btn lp-btn-lg" onClick={cta}>Find my GLP‑1 match</button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={scrollTo('how')}>
                See the three steps <span aria-hidden>→</span>
              </button>
            </div>
            <StoreBadges />
            <div className="lp-trust">
              <span><Icon name="spark" size={15} /> Free</span>
              <span><Icon name="lock" size={15} /> Private 1:1</span>
              <span><Icon name="users" size={15} /> Both opt in</span>
            </div>
          </div>

          <div className="lp-hero-art">
            <MobileMatchPreview />
            <div className="lp-quick-steps" aria-label="How matching works">
              <span><b>1</b> Share your journey</span>
              <span><b>2</b> See compatible people</span>
              <span><b>3</b> Connect when it’s mutual</span>
            </div>
            <div className="lp-phone-wrap">
              <PhoneMock />
            </div>
            <div className="lp-float lp-float-match">
              <div className="lp-float-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
                <Icon name="users" size={18} />
              </div>
              <div><div className="lp-float-t">New match · 94%</div><div className="lp-float-s">You and Maya connected</div></div>
            </div>
            <div className="lp-float lp-float-ms">
              <div className="lp-float-ico" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                <Icon name="spark" size={18} />
              </div>
              <div>
                <div className="lp-float-t">Milestone reached</div>
                <div className="lp-float-s">First month complete</div>
              </div>
            </div>
          </div>
        </div>

        {/* Medication trust strip */}
        <div className="lp-meds">
          <span className="lp-meds-label">Built for people on</span>
          <div className="lp-meds-list">
            {['Ozempic', 'Wegovy', 'Mounjaro', 'Zepbound', 'Saxenda'].map((m) => (
              <span key={m} className="lp-med">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="lp-stats">
        <Reveal className="lp-stats-in">
          <Stat n={5} label="GLP‑1 medications supported" />
          <Stat n={100} suffix="%" label="Private, peer‑led — no feeds, no ads" />
          <Stat n={2} suffix=" min" label="To build your profile and get matched" />
          <Stat text="1:1" label="Every connection is mutual, both opt in" />
        </Reveal>
      </section>

      {/* Problem */}
      <section className="lp-problem">
        <Reveal className="lp-problem-in">
          <div className="lp-eyebrow center"><span className="lp-dot" /> The hard part</div>
          <h2 className="lp-h2">The injection isn't the hard part.</h2>
          <p className="lp-sub">
            It's the plateaus. The side‑effect weeks. The comparison. And explaining it to people
            who haven't lived it. A pen pal who's actually on the same path changes everything.
          </p>
        </Reveal>
      </section>

      {/* Features — alternating product rows */}
      <section className="lp-features" id="features">
        <FeatureRow
          eyebrow="Smart matching"
          title="Matched on what actually matters"
          body="We pair you on medication, treatment stage, goals and communication style — not just who's nearby. Every match is mutual, so your private space only opens when you both say yes."
          art={<MatchMock />}
          cta={<InlineCta onClick={cta}>Find your match</InlineCta>}
        />
        <FeatureRow
          reverse
          eyebrow="Private by design"
          title="A space that's just the two of you"
          body="No feeds. No followers. No judgement. Just a calm, secure 1:1 to check in, vent on the hard days, share a photo, and cheer each other on."
          art={<ChatMock />}
          cta={<InlineCta onClick={cta}>Start a private space</InlineCta>}
        />
        <FeatureRow
          eyebrow="Stay motivated"
          title="Celebrate every milestone together"
          body="Log first injections, plateaus beaten and goals reached on a shared timeline — and get a nudge whenever your pen pal hits one too."
          art={<TimelineMock />}
          cta={<InlineCta onClick={cta}>Build your timeline</InlineCta>}
        />
      </section>

      {/* How it works */}
      <section className="lp-how" id="how">
        <Reveal>
          <div className="lp-eyebrow center"><span className="lp-dot" /> How it works</div>
          <h2 className="lp-h2 center">Your pen pal in three steps</h2>
        </Reveal>
        <div className="lp-steps">
          {[
            ['1', 'Tell us about you', 'A short, private profile — your medication, stage, goals and what support means to you.'],
            ['2', 'Get matched', 'We suggest compatible pen pals. Matches are always mutual — you both opt in.'],
            ['3', 'Grow together', 'Chat, share milestones and show up for each other through the ups and downs.'],
          ].map(([n, t, b], i) => (
            <Reveal key={n} delay={i * 90}><Step n={n} title={t} body={b} /></Reveal>
          ))}
        </div>
      </section>

      {/* Community voices */}
      <section className="lp-voices" id="voices">
        <Reveal>
          <div className="lp-eyebrow center"><span className="lp-dot" /> The community</div>
          <h2 className="lp-h2 center">Real support sounds like this</h2>
          <p className="lp-sub center" style={{ maxWidth: 560, margin: '12px auto 0' }}>
            The kind of everyday encouragement members share in their private 1:1 spaces.
          </p>
        </Reveal>
        <div className="lp-quotes">
          {[
            ['“Week two knocked me flat. Having someone who just *got it* — no explaining — got me through.”', 'Wegovy · month 2'],
            ['“We check in every morning. Some days it’s a win, some days it’s just ‘still here.’ Both count.”', 'Mounjaro · month 5'],
            ['“I stopped comparing myself to strangers online and started rooting for one real person. Game changer.”', 'Ozempic · month 3'],
          ].map(([q, who], i) => (
            <Reveal key={i} delay={i * 90}>
              <figure className="lp-quote">
                <div className="lp-quote-mark" aria-hidden><Icon name="chat" size={18} /></div>
                <blockquote>{q}</blockquote>
                <figcaption>{who}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <p className="lp-voices-note">Representative of the peer support shared on GLPenPal. Not medical advice.</p>
      </section>

      {/* Values band */}
      <section className="lp-values">
        <div className="lp-values-grid">
          {[
            ['heart', 'Always mutual', 'No cold messages — every connection is opted into by both people.'],
            ['lock', 'Private & secure', '1:1 spaces protected by row‑level security. Just you two.'],
            ['users', 'Judgement‑free', 'Real peer support from someone who genuinely gets it.'],
            ['growth', 'Built for the long run', 'Milestones, timelines and check‑ins that keep you both going.'],
          ].map(([icon, t, s], i) => (
            <Reveal key={t} delay={i * 80}><Value icon={icon as ValueIcon} t={t} s={s} /></Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <Reveal>
          <div className="lp-eyebrow center"><span className="lp-dot" /> FAQ</div>
          <h2 className="lp-h2 center">Questions, answered</h2>
        </Reveal>
        <div className="lp-faq-list">
          <Faq q="Is this medical advice?" a="No. GLPenPal is peer support between people — friendship and encouragement, never dosing or medical guidance. For medical questions or concerning symptoms, talk to a clinician." />
          <Faq q="Is it really private?" a="Yes. Conversations are strictly 1:1 and protected by row‑level security in the database — only you and your pen pal can ever see your space." />
          <Faq q="What does it cost?" a="It's free to join, build your profile and get matched." />
          <Faq q="Who is it for?" a="Adults 18+ who are on, starting, or considering a GLP‑1 medication such as Ozempic, Wegovy, Mounjaro, Zepbound or Saxenda." />
          <Faq q="How does matching work?" a="We suggest compatible pen pals based on your medication, stage, goals and communication style. You both opt in — matches are always mutual." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <Reveal className="lp-final-card">
          <div className="lp-glow lp-glow-c" />
          <div className="lp-logo-badge"><BrandLogo width={190} /></div>
          <h2 className="lp-h2">Someone out there gets exactly what you're going through.</h2>
          <p className="lp-sub">Find them today — it only takes a couple of minutes.</p>
          <button className="lp-btn lp-btn-lg" onClick={cta}>Find my GLP‑1 match</button>
          <StoreBadges center />
        </Reveal>
      </section>

      <div className={`lp-mobile-dock${showMobileCta ? ' is-visible' : ''}`}>
        <div>
          <strong>Ready to meet your match?</strong>
          <span>Free · private · about 2 minutes</span>
        </div>
        <button className="lp-btn" onClick={cta}>Start</button>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div className="lp-brand"><BrandLockup height={42} /></div>
          <div className="lp-footer-links">
            <a onClick={scrollTo('how')}>How it works</a>
            <a onClick={scrollTo('faq')}>FAQ</a>
            <a onClick={() => navigate('/privacy')}>Privacy</a>
            <a onClick={() => navigate('/terms')}>Terms</a>
          </div>
          <p className="lp-fine">
            Peer support only. GLPenPal does not provide medical advice. For medical questions or
            concerning symptoms, contact a clinician. © {2026} GLPenPal.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ---------------- motion + primitives ---------------- */

// Reveal-on-scroll wrapper (IntersectionObserver, one-shot). Respects reduced
// motion via CSS (.lp-reveal transitions are disabled by the global media rule).
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`lp-reveal${inView ? ' lp-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function Stat({ n, suffix = '', text, label }: { n?: number; suffix?: string; text?: string; label: string }) {
  return (
    <div className="lp-stat">
      <div className="lp-stat-n">{text ? text : <Counter to={n ?? 0} suffix={suffix} />}</div>
      <div className="lp-stat-l">{label}</div>
    </div>
  )
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return }
      const dur = 1300
      let start: number | null = null
      const step = (t: number) => {
        if (start === null) start = t
        const p = Math.min(1, (t - start) / dur)
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{val}{suffix}</span>
}

function InlineCta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="lp-inline-cta" onClick={onClick}>{children} <span aria-hidden>→</span></button>
}

// App-store download badges. Each badge renders only once its URL is filled in
// (src/constants.ts) — so this is safe to ship before the apps go live.
function StoreBadges({ center }: { center?: boolean }) {
  if (!APP_STORE_URL && !PLAY_STORE_URL) return null
  return (
    <div className={`lp-store-row${center ? ' center' : ''}`}>
      {APP_STORE_URL && (
        <a className="lp-store-badge" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
            <path d="M17.05 12.04c-.03-2.9 2.37-4.29 2.48-4.36-1.35-1.98-3.46-2.25-4.21-2.28-1.79-.18-3.5 1.05-4.41 1.05-.91 0-2.31-1.03-3.8-1-1.95.03-3.75 1.13-4.76 2.88-2.03 3.52-.52 8.73 1.46 11.59.97 1.4 2.12 2.97 3.63 2.91 1.46-.06 2.01-.94 3.77-.94 1.76 0 2.26.94 3.8.91 1.57-.03 2.56-1.42 3.52-2.83 1.11-1.62 1.57-3.19 1.59-3.27-.03-.02-3.05-1.17-3.08-4.64zM14.13 3.57c.8-.98 1.35-2.33 1.2-3.68-1.16.05-2.57.77-3.4 1.74-.74.86-1.39 2.24-1.22 3.56 1.29.1 2.62-.66 3.42-1.62z" />
          </svg>
          <span><small>Download on the</small>App Store</span>
        </a>
      )}
      {PLAY_STORE_URL && (
        <a className="lp-store-badge" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="currentColor">
            <path d="M3.6 2.3c-.24.25-.38.64-.38 1.14v17.12c0 .5.14.89.39 1.13l.06.06 9.59-9.59v-.22L3.66 2.24l-.06.06zm12.79 12.79l-3.2-3.2v-.22l3.2-3.2.07.04 3.79 2.15c1.08.62 1.08 1.62 0 2.24l-3.79 2.15-.07.04zM14.02 12l-9.4 9.4c.36.38.94.42 1.6.05l11.2-6.36L14.02 12zM7.82 2.55C7.16 2.18 6.58 2.22 6.22 2.6l9.4 9.4 2.4-2.4L6.82 3.24z" />
          </svg>
          <span><small>Get it on</small>Google Play</span>
        </a>
      )}
    </div>
  )
}

/* ---------------- building blocks ---------------- */

function FeatureRow({ eyebrow, title, body, art, reverse, cta }: {
  eyebrow: string; title: string; body: string; art: ReactNode; reverse?: boolean; cta?: ReactNode
}) {
  return (
    <Reveal className={`lp-frow${reverse ? ' reverse' : ''}`}>
      <div className="lp-frow-copy">
        <div className="lp-eyebrow"><span className="lp-dot" /> {eyebrow}</div>
        <h3 className="lp-h3">{title}</h3>
        <p className="lp-sub">{body}</p>
        {cta}
      </div>
      <div className="lp-frow-art">
        <div className="lp-glow lp-glow-soft" />
        {art}
      </div>
    </Reveal>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="lp-step">
      <div className="lp-step-n">{n}</div>
      <h3 className="lp-step-t">{title}</h3>
      <p>{body}</p>
    </div>
  )
}

type ValueIcon = 'heart' | 'lock' | 'users' | 'growth'
function Value({ icon, t, s }: { icon: ValueIcon; t: string; s: string }) {
  return (
    <div className="lp-value">
      <div className="lp-value-ico"><Icon name={icon} size={20} /></div>
      <div className="lp-value-t">{t}</div>
      <div className="lp-value-s">{s}</div>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="lp-faq-item">
      <summary>{q}<span className="lp-faq-plus" aria-hidden>+</span></summary>
      <p>{a}</p>
    </details>
  )
}

/* ---------------- product mockups ---------------- */

function PhoneMock() {
  return (
    <div className="lp-phone" aria-hidden>
      <div className="lp-phone-notch" />
      <div className="lp-phone-screen">
        <div className="lp-app-top">
          <span className="lp-app-title">Hi Alex</span>
          <span className="lp-app-bell"><Icon name="bell" size={16} /></span>
        </div>
        <div className="lp-app-card">
          <div className="lp-app-row">
            <div className="lp-ava" style={{ background: 'linear-gradient(135deg,#5e8c74,#7ba890)' }}>M</div>
            <div style={{ flex: 1 }}>
              <div className="lp-app-name">Maya</div>
              <div className="lp-app-muted">Wegovy</div>
            </div>
            <span className="lp-app-chip green">Pen pal</span>
          </div>
          <div className="lp-app-stats">
            <div><b>34</b><span>Days</span></div>
            <div><b>6</b><span>Milestones</span></div>
            <div><b>3</b><span>Levels</span></div>
          </div>
        </div>
        <div className="lp-app-bubbles">
          <div className="lp-b them">How did the nausea week go?</div>
          <div className="lp-b me">So much better. Your tip really helped.</div>
        </div>
        <div className="lp-app-ms">
          <span className="lp-app-ms-ico"><Icon name="spark" size={14} /></span>
          Maya reached <b>goal weight</b>
        </div>
      </div>
    </div>
  )
}

function MobileMatchPreview() {
  return (
    <div className="lp-mobile-match" aria-hidden>
      <div className="lp-mobile-match-top">
        <span>Example match</span>
        <strong>94% compatible</strong>
      </div>
      <div className="lp-mobile-match-people">
        <div className="lp-match-avatars">
          <span>YO</span>
          <span>MA</span>
        </div>
        <div>
          <strong>You + Maya</strong>
          <small>Wegovy · months 1–3</small>
        </div>
        <span className="lp-mutual-chip">Mutual</span>
      </div>
      <div className="lp-match-reasons">
        <span>Same medication</span>
        <span>Similar goals</span>
        <span>Daily check-ins</span>
      </div>
      <div className="lp-match-message">
        <Icon name="chat" size={16} />
        <span>“Week two was rough for me too. You’re not alone.”</span>
      </div>
    </div>
  )
}

function MatchMock() {
  return (
    <div className="lp-mock" aria-hidden>
      <div className="lp-app-row">
        <div className="lp-ava" style={{ background: 'linear-gradient(135deg,#7ba890,#c2955f)' }}>S</div>
        <div style={{ flex: 1 }}>
          <div className="lp-app-name">Sofia</div>
          <div className="lp-mock-chips"><span className="lp-app-chip green">Ozempic</span><span className="lp-app-chip">3–6 months</span></div>
        </div>
        <span className="lp-app-chip green">92%</span>
      </div>
      <div className="lp-mock-why">
        <div className="lp-mock-why-t">Why you might match</div>
        <div className="lp-mock-chips">
          <span className="lp-app-chip green">Same medication</span>
          <span className="lp-app-chip green">Similar goals</span>
        </div>
      </div>
      <div className="lp-mock-actions">
        <span className="lp-mock-pass">Pass</span>
        <span className="lp-mock-connect">I'd like to connect</span>
      </div>
    </div>
  )
}

function ChatMock() {
  return (
    <div className="lp-mock" aria-hidden>
      <div className="lp-app-bubbles tall">
        <div className="lp-b them">Took my first injection today — nervous but did it.</div>
        <div className="lp-b me">That's huge. Week one was the hardest for me.</div>
        <div className="lp-b them">Needed to hear that. Glad I'm not doing this alone.</div>
        <div className="lp-b me">Always here. Message me on the rough days.</div>
      </div>
    </div>
  )
}

function TimelineMock() {
  const items = [
    { t: 'Reached goal weight', s: 'Today' },
    { t: 'Overcame a plateau', s: '2 weeks ago' },
    { t: 'First month complete', s: 'Last month' },
  ]
  return (
    <div className="lp-mock" aria-hidden>
      <div className="lp-tl">
        {items.map((it, i) => (
          <div className="lp-tl-item" key={i}>
            <span className="lp-tl-dot"><Icon name="spark" size={12} /></span>
            <div>
              <div className="lp-app-name" style={{ fontSize: 14 }}>{it.t}</div>
              <div className="lp-app-muted">{it.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
