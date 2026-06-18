import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { USE_SUPABASE } from '../lib/env'

export function Landing() {
  const navigate = useNavigate()
  const { currentUser } = useStore()

  // Primary CTA: in Supabase mode, send people to create an account; in demo
  // mode, jump straight into onboarding (or safety if already onboarded).
  const cta = () => {
    if (USE_SUPABASE) return navigate('/auth')
    if (currentUser?.onboardingComplete && !currentUser.acceptedSafety) navigate('/safety')
    else navigate('/onboarding')
  }

  const scrollTo = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mkt">
      <header className="mkt-nav">
        <div className="mkt-brand">
          <span className="mkt-brand-logo">🫂</span>
          <span className="mkt-brand-name">GLP Buddy</span>
        </div>
        <div className="mkt-nav-actions">
          <a className="mkt-link" onClick={scrollTo('how')}>How it works</a>
          <button className="btn sm secondary" onClick={cta}>
            {USE_SUPABASE ? 'Sign in' : 'Get started'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mkt-hero">
        <div className="mkt-hero-text">
          <div className="mkt-eyebrow">🤝 Peer support for your GLP-1 journey</div>
          <h1 className="mkt-h1">
            A GLP buddy who <span className="grad">gets it</span>.
          </h1>
          <p className="mkt-sub">
            Get matched 1:1 with someone on a similar medication, stage and goals —
            for the wins worth sharing and the days the scale can't explain.
          </p>
          <div className="mkt-cta-row">
            <button className="btn mkt-cta" onClick={cta}>Find my buddy →</button>
            <button className="btn outline" onClick={scrollTo('how')}>See how it works</button>
          </div>
          <div className="mkt-trust">
            <span>🔒 Private by design</span>
            <span className="dot">•</span>
            <span>💙 Not medical advice</span>
            <span className="dot">•</span>
            <span>🔞 18+</span>
          </div>
        </div>

        {/* Product preview — a peek at a real buddy space */}
        <div className="mkt-hero-visual" aria-hidden="true">
          <div className="mkt-preview">
            <div className="mkt-preview-head">
              <div className="mkt-ava" style={{ background: 'linear-gradient(135deg,#7c6cf0,#ff8a65)' }}>P</div>
              <div>
                <div className="mkt-preview-name">Priya</div>
                <div className="mkt-preview-sub">Ozempic · same stage as you</div>
              </div>
              <span className="chip green" style={{ marginLeft: 'auto' }}>92% match</span>
            </div>
            <div className="mkt-chat">
              <div className="mkt-bubble them">Took my first injection today 😅 nervous but did it!</div>
              <div className="mkt-bubble me">That's huge!! Week one was the hardest for me — so proud of you 💪</div>
              <div className="mkt-bubble them">Honestly needed to hear that. Glad I'm not doing this alone 🫶</div>
            </div>
            <div className="mkt-milestone">🎯 Priya reached a new milestone — <strong>first month complete</strong></div>
          </div>
          <div className="mkt-blob mkt-blob-1" />
          <div className="mkt-blob mkt-blob-2" />
        </div>
      </section>

      {/* Why */}
      <section className="mkt-section" id="why">
        <div className="mkt-eyebrow center">Why it works</div>
        <h2 className="mkt-h2">Built for the whole journey, not just day one.</h2>
        <div className="mkt-grid">
          <Feature icon="🤝" title="Matched on your journey"
            body="Same medication, treatment stage and goals — so the person you meet actually understands what you're going through." />
          <Feature icon="🌱" title="Made for the long run"
            body="Shared milestones, a private timeline and gentle check-ins keep you both motivated week after week." />
          <Feature icon="💬" title="A private space, just you two"
            body="No feeds, no followers, no judgement. Real peer support in a calm, safe space — never medical advice." />
        </div>
      </section>

      {/* How it works */}
      <section className="mkt-section mkt-steps" id="how">
        <div className="mkt-eyebrow center">How it works</div>
        <h2 className="mkt-h2">Your buddy in three simple steps.</h2>
        <div className="mkt-grid">
          <Step n={1} title="Tell us about you" body="A quick, private profile — your medication, stage, goals and what support means to you." />
          <Step n={2} title="Get matched" body="We suggest compatible buddies. Matches are always mutual — your space only opens when you both say yes." />
          <Step n={3} title="Grow together" body="Chat, celebrate milestones and show up for each other through the ups and downs." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mkt-final">
        <div className="mkt-final-inner">
          <div className="mkt-final-logo">🫂</div>
          <h2>Your journey is better with a buddy.</h2>
          <p>Free to join. Match with someone who truly gets it — today.</p>
          <button className="btn mkt-cta" onClick={cta}>Find my buddy →</button>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-brand">
          <span className="mkt-brand-logo">🫂</span>
          <span className="mkt-brand-name">GLP Buddy</span>
        </div>
        <div className="mkt-foot-links">
          <a onClick={() => navigate('/terms')}>Terms</a>
          <a onClick={() => navigate('/privacy')}>Privacy</a>
        </div>
        <p className="mkt-disclaimer">
          Peer support only. GLP Buddy does not provide medical advice. For medical
          questions or concerning symptoms, contact a clinician.
        </p>
      </footer>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="mkt-card">
      <div className="mkt-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mkt-card mkt-step">
      <div className="mkt-step-n">{n}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}
