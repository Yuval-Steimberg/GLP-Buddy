import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'

export function Landing() {
  const navigate = useNavigate()
  const { currentUser } = useStore()

  const cta = () => {
    if (currentUser?.onboardingComplete && !currentUser.acceptedSafety) navigate('/safety')
    else navigate('/onboarding')
  }

  return (
    <div className="landing">
      <div className="logo">🫂</div>
      <h1>GLP Buddy</h1>
      <div className="tag">A GLP buddy who gets it.</div>
      <p className="desc">
        Get matched with someone going through a similar GLP journey.
      </p>

      <div className="features">
        <div className="feature">
          <span className="fi">🤝</span>
          <div>
            <strong>Matched on your journey</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              Same medication, stage and goals.
            </div>
          </div>
        </div>
        <div className="feature">
          <span className="fi">🌱</span>
          <div>
            <strong>Built for the long run</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              Shared milestones, timeline and check-ins.
            </div>
          </div>
        </div>
        <div className="feature">
          <span className="fi">💬</span>
          <div>
            <strong>A private space, just you two</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              Real peer support — not medical advice.
            </div>
          </div>
        </div>
      </div>

      <button className="btn" onClick={cta}>
        Find my buddy →
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Peer support only. GLP Buddy does not provide medical advice.
      </p>
    </div>
  )
}
