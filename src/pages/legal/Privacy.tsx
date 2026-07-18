import { useNavigate } from 'react-router-dom'

export function Privacy() {
  const navigate = useNavigate()
  return (
    <div className="screen no-nav">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <span className="title" style={{ fontSize: 18 }}>Privacy Policy</span>
        <div className="spacer" />
      </div>

      <div className="card">
        <p className="muted" style={{ fontSize: 12 }}>Last updated: template — review with legal counsel before launch.</p>

        <h3>Who we are</h3>
        <p>GLPenPal ("we") is a peer-support platform that connects people using GLP-1 medications. We are not a healthcare provider and do not provide medical advice.</p>

        <h3>What we collect</h3>
        <p>Account details (email), profile information you provide (nickname, age range, gender, medication, treatment stage, weight ranges, goals, bio and interests), messages and milestones, and any private journey entries you choose to add such as injection history, symptoms, weights, meals and personal notes. We also process basic technical and usage data needed to operate and protect the service.</p>

        <h3>How we use it</h3>
        <p>To create your account, suggest compatible buddies, operate chat, milestones and your shared timeline, provide private tracking summaries and exports, send notifications, and keep the community safe (moderation, reports, blocks).</p>
        <p>Your injection, symptom, weight and meal logs are private to your account. They are not shown to buddies. A clinician summary is generated only when you request it and is then shared or downloaded using your device.</p>

        <h3>Health-related information</h3>
        <p>Some information you share (e.g. medication, weight ranges) is sensitive. We store it encrypted, restrict access using row-level security, and never sell it. Share only what you are comfortable with — your bio and messages are visible to matched buddies.</p>

        <h3>Sharing</h3>
        <p>Profile details and messages are shared only with buddies you mutually match with. We use trusted infrastructure providers (e.g. Supabase for database/auth, a hosting provider, and an error-monitoring service) under data-processing agreements.</p>

        <h3>Your rights</h3>
        <p>You can edit your profile, end buddy relationships, block users, and request export or deletion of your data at any time by contacting support.</p>

        <h3>Age</h3>
        <p>GLPenPal is for adults 18 and over.</p>

        <div className="banner warn" style={{ marginTop: 12 }}>
          GLPenPal does not provide medical advice. For medical questions or concerning symptoms, contact a clinician.
        </div>
      </div>
    </div>
  )
}
