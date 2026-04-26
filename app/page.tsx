import { getAllWorkshops } from '@/lib/workshops';
import Link from 'next/link';

export default function Home() {
  const workshops = getAllWorkshops();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '64px 32px' }}>
      <header style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--aa-muted)', marginBottom: 8 }}>
          Alpha Anywhere · Chapter Event Kit
        </div>
        <h1 style={{ fontSize: 48, margin: 0 }}>Pick a workshop.</h1>
        <p style={{ fontSize: 20, color: 'var(--aa-muted)', maxWidth: 640, marginTop: 16 }}>
          Choose one of the workshops below. In a few questions you'll get back a Circle event cover,
          a parent-facing description, a materials checklist, a day-of run-of-show, and two video trailers.
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: 20, color: 'var(--aa-muted)', fontWeight: 500, marginBottom: 20, fontFamily: 'inherit' }}>
          {workshops.length} workshops available
        </h2>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {workshops.map((w) => (
            <Link
              key={w.slug}
              href={`/workshops/${w.slug}`}
              style={{
                display: 'block',
                padding: 24,
                background: 'var(--aa-white)',
                border: '1px solid rgba(7, 34, 86, 0.12)',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'var(--aa-ink)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 22 }}>{w.title}</h3>
                {w.popular && (
                  <span style={{ background: 'var(--aa-accent)', color: 'white', fontSize: 11, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Popular
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 16px', color: 'var(--aa-muted)', fontSize: 14, lineHeight: 1.5 }}>
                {w.oneLiner}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--aa-muted)', letterSpacing: '0.02em' }}>
                <span>Ages {w.ages}</span>
                <span>·</span>
                <span>{w.duration} min</span>
                <span>·</span>
                <span>{w.category}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(7, 34, 86, 0.12)', fontSize: 13, color: 'var(--aa-muted)' }}>
        <p style={{ margin: 0 }}>
          Content is edited in <code>content/workshops/</code>. See the <a href="https://github.com" target="_blank" rel="noreferrer">README</a> for the edit + deploy flow.
        </p>
      </footer>
    </main>
  );
}
