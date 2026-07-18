import { useNavigate } from 'react-router-dom'

export function Terms() {
  const navigate = useNavigate()
  return (
    <div className="screen no-nav">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <span className="title" style={{ fontSize: 18 }}>Terms of Service</span>
        <div className="spacer" />
      </div>

      <div className="card">
        <p className="muted" style={{ fontSize: 12 }}>Last updated: template — review with legal counsel before launch.</p>

        <h3>Acceptance</h3>
        <p>By using GLPenPal you agree to these terms. You must be 18 or older.</p>

        <h3>Not medical advice</h3>
        <p><strong>GLPenPal is a peer-support platform and does not provide medical advice.</strong> Users must not advise each other about dosing, medication changes, stopping medication, or urgent symptoms. For medical questions or concerning symptoms, contact a clinician. In an emergency, call your local emergency services.</p>
        <p>Journey logs, insights and clinician summaries are based on information you enter. They may be incomplete or inaccurate and are not clinical records, diagnoses, symptom assessments, treatment recommendations or medication guidance.</p>

        <h3>Community conduct</h3>
        <p>Be kind and respectful. No harassment, hate, spam, selling, sharing of others' private information, or impersonation. Don't give or solicit medical/dosing guidance.</p>

        <h3>Reports, blocks &amp; moderation</h3>
        <p>You can report or block any user. We may remove content or suspend accounts that violate these terms. We aim to review reports promptly but provide the service "as is".</p>

        <h3>Your content</h3>
        <p>You own what you write. You grant us a limited license to store and display it to your buddies so the service can function.</p>

        <h3>Limitation of liability</h3>
        <p>To the fullest extent permitted by law, GLPenPal is not liable for interactions between users or for any reliance on peer support in place of professional medical care.</p>

        <h3>Changes</h3>
        <p>We may update these terms; we'll notify you of material changes.</p>
      </div>
    </div>
  )
}
