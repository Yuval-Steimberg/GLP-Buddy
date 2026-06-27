import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { USE_SUPABASE } from '../lib/env'
import { Icon, BrandMark } from '../components/Icon'

export function Landing() {
  const navigate = useNavigate()
  const { currentUser } = useStore()

  const cta = () => {
    if (USE_SUPABASE) return navigate('/auth')
    if (currentUser?.onboardingComplete && !currentUser.acceptedSafety) navigate('/safety')
    else navigate('/onboarding')
  }
  const scrollTo = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="lp">
      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-nav-in">
          <div className="lp-brand">
            <BrandMark size={30} />
            <span>GLPenPal</span>
          </div>
          <nav className="lp-nav-links">
            <a onClick={scrollTo('how')}>How it works</a>
            <a onClick={scrollTo('features')}>Features</a>
            <a onClick={scrollTo('faq')}>FAQ</a>
          </nav>
          <button className="lp-btn lp-btn-sm" onClick={cta}>
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
            <div className="lp-eyebrow"><span className="lp-dot" /> Peer support for GLP‑1</div>
            <h1 className="lp-h1">You don't have to do GLP‑1 <span className="lp-em">alone</span>.</h1>
            <p className="lp-lead">
              Get matched 1:1 with a pen pal on the same medication, stage and goals — for the
              wins, the rough side‑effect weeks, and the days the scale makes no sense.
            </p>
            <div className="lp-cta-row">
              <button className="lp-btn lp-btn-lg" onClick={cta}>Find my pen pal — it's free</button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={scrollTo('how')}>
                See how it works <span aria-hidden>→</span>
              </button>
            </div>
            <div className="lp-trust">
              <span><Icon name="spark" size={15} /> Free to join</span>
              <span><Icon name="lock" size={15} /> Private 1:1</span>
              <span><Icon name="shield" size={15} /> 18+ only</span>
            </div>
          </div>

          <div className="lp-hero-art">
            <PhoneMock />
            <div className="lp-float lp-float-match">
              <div className="lp-float-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
                <Icon name="users" size={18} />
              </div>
              <div>
                <div className="lp-float-t">New match · 94%</div>
                <div className="lp-float-s">You and Maya connected</div>
              </div>
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

      {/* Problem */}
      <section className="lp-problem">
        <div className="lp-problem-in">
          <div className="lp-eyebrow center"><span className="lp-dot" /> The hard part</div>
          <h2 className="lp-h2">The injection isn't the hard part.</h2>
          <p className="lp-sub">
            It's the plateaus. The side‑effect weeks. The comparison. And explaining it to people
            who haven't lived it. A pen pal who's actually on the same path changes everything.
          </p>
        </div>
      </section>

      {/* Features — alternating product rows */}
      <section className="lp-features" id="features">
        <FeatureRow
          eyebrow="Smart matching"
          title="Matched on what actually matters"
          body="We pair you on medication, treatment stage, goals and communication style — not just who's nearby. Every match is mutual, so your private space only opens when you both say yes."
          art={<MatchMock />}
        />
        <FeatureRow
          reverse
          eyebrow="Private by design"
          title="A space that's just the two of you"
          body="No feeds. No followers. No judgement. Just a calm, secure 1:1 to check in, vent on the hard days, and cheer each other on."
          art={<ChatMock />}
        />
        <FeatureRow
          eyebrow="Stay motivated"
          title="Celebrate every milestone together"
          body="Log first injections, plateaus beaten and goals reached on a shared timeline — and get a nudge whenever your pen pal hits one too."
          art={<TimelineMock />}
        />
      </section>

      {/* How it works */}
      <section className="lp-how" id="how">
        <div className="lp-eyebrow center"><span className="lp-dot" /> How it works</div>
        <h2 className="lp-h2 center">Your pen pal in three steps</h2>
        <div className="lp-steps">
          <Step n="1" title="Tell us about you" body="A short, private profile — your medication, stage, goals and what support means to you." />
          <Step n="2" title="Get matched" body="We suggest compatible pen pals. Matches are always mutual — you both opt in." />
          <Step n="3" title="Grow together" body="Chat, share milestones and show up for each other through the ups and downs." />
        </div>
      </section>

      {/* Values band */}
      <section className="lp-values">
        <div className="lp-values-grid">
          <Value icon="heart" t="Always mutual" s="No cold messages — every connection is opted into by both people." />
          <Value icon="lock" t="Private & secure" s="1:1 spaces protected by row‑level security. Just you two." />
          <Value icon="users" t="Judgement‑free" s="Real peer support from someone who genuinely gets it." />
          <Value icon="growth" t="Built for the long run" s="Milestones, timelines and check‑ins that keep you both going." />
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <div className="lp-eyebrow center"><span className="lp-dot" /> FAQ</div>
        <h2 className="lp-h2 center">Questions, answered</h2>
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
        <div className="lp-final-card">
          <div className="lp-glow lp-glow-c" />
          <BrandMark size={56} />
          <h2 className="lp-h2">Someone out there gets exactly what you're going through.</h2>
          <p className="lp-sub">Find them today — it only takes a couple of minutes.</p>
          <button className="lp-btn lp-btn-lg" onClick={cta}>Find my pen pal — it's free</button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <div className="lp-brand"><BrandMark size={26} /><span>GLPenPal</span></div>
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

/* ---------------- building blocks ---------------- */

function FeatureRow({ eyebrow, title, body, art, reverse }: {
  eyebrow: string; title: string; body: string; art: React.ReactNode; reverse?: boolean
}) {
  return (
    <div className={`lp-frow${reverse ? ' reverse' : ''}`}>
      <div className="lp-frow-copy">
        <div className="lp-eyebrow"><span className="lp-dot" /> {eyebrow}</div>
        <h3 className="lp-h3">{title}</h3>
        <p className="lp-sub">{body}</p>
      </div>
      <div className="lp-frow-art">
        <div className="lp-glow lp-glow-soft" />
        {art}
      </div>
    </div>
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

function Value({ icon, t, s }: { icon: 'heart' | 'lock' | 'users' | 'growth'; t: string; s: string }) {
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
            <div className="lp-ava" style={{ background: 'linear-gradient(135deg,#0e9f87,#f4845f)' }}>M</div>
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
          <div className="lp-b me">So much better. Your tip helped 💚</div>
        </div>
        <div className="lp-app-ms">
          <span className="lp-app-ms-ico"><Icon name="spark" size={14} /></span>
          Maya reached <b>goal weight</b>
        </div>
      </div>
    </div>
  )
}

function MatchMock() {
  return (
    <div className="lp-mock" aria-hidden>
      <div className="lp-app-row">
        <div className="lp-ava" style={{ background: 'linear-gradient(135deg,#7aa8ff,#0e9f87)' }}>S</div>
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
        <div className="lp-b me">Always here. Message me on the rough days 💚</div>
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
