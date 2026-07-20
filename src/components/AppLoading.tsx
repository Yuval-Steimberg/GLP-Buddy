interface AppLoadingProps {
  message?: string
}

export function AppLoading({ message = 'Opening your support space' }: AppLoadingProps) {
  return (
    <section className="premium-loader" role="status" aria-live="polite">
      <div className="premium-loader-shape shape-one" aria-hidden="true" />
      <div className="premium-loader-shape shape-two" aria-hidden="true" />

      <div className="premium-loader-content">
        <div className="premium-loader-logo-stage">
          <span className="premium-loader-halo" aria-hidden="true" />
          <img
            className="premium-loader-logo"
            src="/icons/icon-1024.png"
            srcSet="/icons/icon-512.png 512w, /icons/icon-1024.png 1024w"
            sizes="(max-width: 480px) 184px, 214px"
            width="1024"
            height="1024"
            alt="GLPenPal — a GLP buddy who gets it"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="premium-loader-copy">
          <span className="premium-loader-kicker">YOUR PRIVATE SUPPORT SPACE</span>
          <h1>{message}</h1>
          <p>Bringing the details that matter into place.</p>
        </div>

        <div className="premium-loader-progress" aria-hidden="true">
          <span />
        </div>
        <div className="premium-loader-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  )
}

export function RouteSkeleton() {
  return (
    <section className="screen route-skeleton" role="status" aria-label="Preparing this page">
      <span className="loader-sr">Preparing this page</span>
      <div className="route-skeleton-layout" aria-hidden="true">
        <div className="route-skeleton-top">
          <span className="skeleton-block skeleton-avatar" />
          <span className="skeleton-block skeleton-title" />
          <span className="skeleton-block skeleton-action" />
        </div>

        <div className="route-skeleton-intro">
          <span className="skeleton-block skeleton-kicker" />
          <span className="skeleton-block skeleton-copy wide" />
          <span className="skeleton-block skeleton-copy medium" />
        </div>

        <div className="route-skeleton-card hero">
          <div>
            <span className="skeleton-block skeleton-kicker" />
            <span className="skeleton-block skeleton-card-title" />
            <span className="skeleton-block skeleton-copy wide" />
          </div>
          <span className="skeleton-block skeleton-card-icon" />
        </div>

        <div className="route-skeleton-card">
          <span className="skeleton-block skeleton-avatar large" />
          <div className="route-skeleton-card-copy">
            <span className="skeleton-block skeleton-card-title short" />
            <span className="skeleton-block skeleton-copy wide" />
            <span className="skeleton-block skeleton-copy medium" />
          </div>
        </div>

        <div className="route-skeleton-pills">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>
    </section>
  )
}

const DATA_SKELETON_ITEMS = ['one', 'two', 'three', 'four']

export function DataSkeleton() {
  return (
    <div className="data-skeleton" role="status" aria-label="Preparing dashboard data">
      <span className="loader-sr">Preparing dashboard data</span>
      <div className="data-skeleton-grid" aria-hidden="true">
        {DATA_SKELETON_ITEMS.map((item) => (
          <div className="data-skeleton-stat" key={item}>
            <span className="skeleton-block data-skeleton-number" />
            <span className="skeleton-block data-skeleton-label" />
          </div>
        ))}
      </div>
      <div className="data-skeleton-panel" aria-hidden="true">
        <span className="skeleton-block skeleton-card-title short" />
        <span className="skeleton-block data-skeleton-chart" />
      </div>
    </div>
  )
}
