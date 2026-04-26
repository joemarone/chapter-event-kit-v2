import { getAllWorkshops, getWorkshopBySlug } from '@/lib/workshops';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllWorkshops().map((w) => ({ slug: w.slug }));
}

export default function WorkshopPage({ params }: { params: { slug: string } }) {
  const workshop = getWorkshopBySlug(params.slug);
  if (!workshop) notFound();

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '64px 32px' }}>
      <nav style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 14 }}>← All workshops</Link>
      </nav>

      <header style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--aa-muted)', marginBottom: 8 }}>
          {workshop.category}
        </div>
        <h1 style={{ fontSize: 52, margin: 0 }}>{workshop.title}</h1>
        <p style={{ fontSize: 22, color: 'var(--aa-muted)', marginTop: 16, maxWidth: 720 }}>
          {workshop.oneLiner}
        </p>
        <div style={{ display: 'flex', gap: 24, marginTop: 24, fontSize: 14, color: 'var(--aa-muted)' }}>
          <span>Ages <strong style={{ color: 'var(--aa-ink)' }}>{workshop.ages}</strong></span>
          <span>Duration <strong style={{ color: 'var(--aa-ink)' }}>{workshop.duration} min</strong></span>
          <span>Group <strong style={{ color: 'var(--aa-ink)' }}>{workshop.groupSize}</strong></span>
        </div>
      </header>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 28 }}>Skills</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {workshop.skills.map((s) => (
            <span key={s} style={{ padding: '6px 14px', background: 'var(--aa-white)', border: '1px solid rgba(7,34,86,0.2)', borderRadius: 99, fontSize: 14 }}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section
        style={{ marginBottom: 48 }}
        dangerouslySetInnerHTML={{ __html: workshop.bodyHtml }}
      />

      <section style={{ padding: 32, background: 'var(--aa-navy)', color: 'var(--aa-white)', borderRadius: 16 }}>
        <h2 style={{ color: 'white', margin: 0 }}>Build the event kit</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 12 }}>
          Answer a few questions and get back cover images, a parent-facing description, a materials checklist,
          a day-of run-of-show, and two video trailers.
        </p>
        <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          🚧 The kit builder UI ships in Phase B. For now, all content lives in <code>content/workshops/{workshop.slug}/</code>.
        </div>
      </section>
    </main>
  );
}
