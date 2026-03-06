'use client'

import Link from 'next/link'

export function LandingPage() {
  return (
    <div
      style={{ background: '#0e0d0b', color: '#f5f1ea', fontFamily: 'var(--font-geist-sans)' }}
      className="min-h-screen"
    >
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0,0) }
          10% { transform: translate(-2%,-3%) }
          20% { transform: translate(3%,1%) }
          30% { transform: translate(-1%,4%) }
          40% { transform: translate(2%,-2%) }
          50% { transform: translate(-3%,2%) }
          60% { transform: translate(1%,-3%) }
          70% { transform: translate(-2%,1%) }
          80% { transform: translate(3%,-1%) }
          90% { transform: translate(-1%,3%) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashDraw {
          to { stroke-dashoffset: 0; }
        }
        .sw-grain::after {
          content: '';
          position: fixed;
          inset: -200%;
          width: 400%;
          height: 400%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.04;
          animation: grain 8s steps(1) infinite;
          pointer-events: none;
          z-index: 100;
        }
        .fu1 { animation: fadeUp 0.8s ease 0.2s both; }
        .fu2 { animation: fadeUp 0.8s ease 0.5s both; }
        .fu3 { animation: fadeUp 0.8s ease 0.8s both; }
        .fu4 { animation: fadeUp 0.8s ease 1.1s both; }
        .gold-dash {
          stroke-dasharray: 700;
          stroke-dashoffset: 700;
          animation: dashDraw 2.4s ease 1.6s forwards;
        }
        .sw-step { transition: background 200ms; }
        .sw-step:hover { background: #111009 !important; }
        .sw-feat  { transition: background 200ms; }
        .sw-feat:hover { background: #111009 !important; }
        .sw-btn-gold { transition: background 200ms, transform 200ms; }
        .sw-btn-gold:hover { background: #d4aa72 !important; transform: translateY(-1px); }
        .sw-link-muted { transition: color 200ms; }
        .sw-link-muted:hover { color: #f5f1ea !important; }
      `}</style>

      {/* Grain overlay */}
      <div className="sw-grain fixed inset-0 pointer-events-none" style={{ zIndex: 50 }} aria-hidden />

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header
        className="fixed inset-x-0 top-0 z-40 h-16 flex items-center"
        style={{
          borderBottom: '1px solid rgba(184,147,90,0.15)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(14,13,11,0.88)',
        }}
      >
        <nav className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--font-literata)',
              color: '#b8935a',
              fontSize: '1.1rem',
              letterSpacing: '0.02em',
              fontStyle: 'italic',
            }}
          >
            StoryWriter
          </span>

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="sw-link-muted"
              style={{
                color: '#7a7368',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="sw-btn-gold"
              style={{
                background: '#b8935a',
                color: '#0e0d0b',
                fontSize: '0.72rem',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: '0.5rem 1.25rem',
                display: 'inline-block',
              }}
            >
              Begin Writing
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center pt-16"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(184,147,90,0.07) 0%, transparent 70%)',
        }}
      >
        {/* Decorative diagonal lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <svg
            className="absolute"
            style={{ top: '12%', right: '7%', opacity: 0.28, width: '260px', height: '260px' }}
            viewBox="0 0 260 260"
          >
            <line x1="0" y1="260" x2="260" y2="0" stroke="#b8935a" strokeWidth="0.75" strokeDasharray="4 7" className="gold-dash" />
          </svg>
          <svg
            className="absolute"
            style={{ bottom: '18%', left: '5%', opacity: 0.18, width: '180px', height: '180px' }}
            viewBox="0 0 180 180"
          >
            <line x1="0" y1="180" x2="180" y2="0" stroke="#b8935a" strokeWidth="0.5" strokeDasharray="3 6" className="gold-dash" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <p
            className="fu1"
            style={{
              color: '#b8935a',
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
            }}
          >
            The professional novel pipeline
          </p>

          <h1
            className="fu2"
            style={{
              fontFamily: 'var(--font-literata)',
              fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: '#f5f1ea',
              marginBottom: '1.75rem',
            }}
          >
            Write the novel<br />
            <em style={{ color: '#b8935a' }}>you've been carrying.</em>
          </h1>

          <p
            className="fu3"
            style={{
              color: '#7a7368',
              fontSize: '1.0625rem',
              lineHeight: 1.8,
              fontWeight: 300,
              maxWidth: '520px',
              margin: '0 auto 2.5rem',
            }}
          >
            Structured intake, beat-sheet outlines, chapter-by-chapter generation, and voice
            analysis that makes the AI sound like you — not like a machine.
          </p>

          <div className="fu4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="sw-btn-gold"
              style={{
                background: '#b8935a',
                color: '#0e0d0b',
                fontSize: '0.78rem',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: '0.9rem 2.25rem',
                display: 'inline-block',
              }}
            >
              Begin your novel
            </Link>
            <a
              href="#method"
              className="sw-link-muted flex items-center gap-2"
              style={{
                color: '#7a7368',
                fontSize: '0.78rem',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}
            >
              See how it works <span>↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <Divider />

      {/* ── The Method ─────────────────────────────────────────────── */}
      <section id="method" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <p
              style={{
                color: '#b8935a',
                fontSize: '0.675rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              The method
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-literata)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 400,
                color: '#f5f1ea',
                maxWidth: '540px',
                lineHeight: 1.2,
              }}
            >
              A pipeline built for<br />
              <em style={{ color: '#b8935a' }}>serious novelists.</em>
            </h2>
          </div>

          {/* Steps grid — gap-px on gold background creates hairline dividers */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px"
            style={{ background: 'rgba(184,147,90,0.12)' }}
          >
            {STEPS.map(({ num, title, desc }) => (
              <div
                key={num}
                className="sw-step"
                style={{ background: '#0e0d0b', padding: '2.5rem 2rem' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-literata)',
                    fontSize: '3.25rem',
                    color: 'rgba(184,147,90,0.18)',
                    lineHeight: 1,
                    marginBottom: '1.25rem',
                    fontStyle: 'italic',
                  }}
                >
                  {num}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-literata)',
                    fontSize: '1.0625rem',
                    fontWeight: 400,
                    color: '#f5f1ea',
                    marginBottom: '0.75rem',
                    lineHeight: 1.35,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    color: '#7a7368',
                    fontSize: '0.84rem',
                    lineHeight: 1.75,
                    fontWeight: 300,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Voice & Features ───────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            {/* Left: copy */}
            <div>
              <p
                style={{
                  color: '#b8935a',
                  fontSize: '0.675rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                }}
              >
                Your voice
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-literata)',
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  fontWeight: 400,
                  color: '#f5f1ea',
                  lineHeight: 1.2,
                  marginBottom: '1.5rem',
                }}
              >
                The AI writes<br />
                <em style={{ color: '#b8935a' }}>in your style,</em><br />
                not its own.
              </h2>
              <p
                style={{
                  color: '#7a7368',
                  fontSize: '0.9375rem',
                  lineHeight: 1.85,
                  fontWeight: 300,
                  marginBottom: '1.25rem',
                }}
              >
                Upload writing samples and our voice analysis engine extracts your prose rhythm,
                sentence cadence, vocabulary preferences, and stylistic signatures.
              </p>
              <p
                style={{
                  color: '#7a7368',
                  fontSize: '0.9375rem',
                  lineHeight: 1.85,
                  fontWeight: 300,
                }}
              >
                That profile is injected into every chapter — so the result reads like{' '}
                <span style={{ color: '#f5f1ea', fontStyle: 'italic' }}>you</span> wrote it.
                Because, in every way that matters, you did.
              </p>
            </div>

            {/* Right: feature list */}
            <div className="space-y-px" style={{ background: 'rgba(184,147,90,0.12)' }}>
              {FEATURES.map(({ label, desc }) => (
                <div
                  key={label}
                  className="sw-feat"
                  style={{ background: '#0e0d0b', padding: '1.5rem 1.75rem' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#b8935a',
                        marginTop: '0.55rem',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          color: '#f5f1ea',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                          marginBottom: '0.3rem',
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          color: '#7a7368',
                          fontSize: '0.8125rem',
                          lineHeight: 1.65,
                          fontWeight: 300,
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pull Quote ─────────────────────────────────────────────── */}
      <section
        style={{
          background: 'rgba(184,147,90,0.03)',
          borderTop: '1px solid rgba(184,147,90,0.15)',
          borderBottom: '1px solid rgba(184,147,90,0.15)',
        }}
        className="py-24"
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            style={{
              fontFamily: 'var(--font-literata)',
              fontSize: 'clamp(1.5rem, 3.5vw, 2.375rem)',
              fontWeight: 400,
              color: '#f5f1ea',
              lineHeight: 1.45,
              fontStyle: 'italic',
            }}
          >
            "Every great novel begins with structure.{' '}
            <span style={{ color: '#b8935a' }}>
              Structure gives the imagination permission to soar.
            </span>"
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="py-36">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p
            style={{
              color: '#b8935a',
              fontSize: '0.675rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}
          >
            Begin today
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-literata)',
              fontSize: 'clamp(2.25rem, 5vw, 4.25rem)',
              fontWeight: 400,
              color: '#f5f1ea',
              lineHeight: 1.12,
              marginBottom: '1.75rem',
            }}
          >
            Your novel is waiting<br />
            <em style={{ color: '#b8935a' }}>to be written.</em>
          </h2>
          <p
            style={{
              color: '#7a7368',
              fontSize: '0.9375rem',
              lineHeight: 1.8,
              fontWeight: 300,
              maxWidth: '440px',
              margin: '0 auto 2.75rem',
            }}
          >
            Join writers who've stopped staring at blank pages and started finishing novels.
          </p>
          <Link
            href="/login"
            className="sw-btn-gold"
            style={{
              background: '#b8935a',
              color: '#0e0d0b',
              fontSize: '0.78rem',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              fontWeight: 600,
              padding: '1rem 2.75rem',
              display: 'inline-block',
            }}
          >
            Start writing — it's free
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(184,147,90,0.15)', padding: '1.75rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--font-literata)',
              color: '#b8935a',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              opacity: 0.6,
            }}
          >
            StoryWriter
          </span>
          <p style={{ color: '#7a7368', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
            &copy; {new Date().getFullYear()} StoryWriter
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    title: 'Capture Your Vision',
    desc: 'Guided intake collects your premise, genre, themes, and characters — the raw material of your novel.',
  },
  {
    num: '02',
    title: 'Build Your Blueprint',
    desc: 'Generate a full beat-sheet outline. Adjust chapter arcs, characters, and plot threads until it\'s exactly right.',
  },
  {
    num: '03',
    title: 'Generate, Chapter by Chapter',
    desc: 'AI writes each chapter with continuity memory — tracking characters, timelines, and foreshadowing across the entire manuscript.',
  },
  {
    num: '04',
    title: 'Export Your Manuscript',
    desc: 'Download a clean, formatted manuscript ready for editing, agent submission, or self-publishing.',
  },
]

const FEATURES = [
  {
    label: 'Voice Analysis',
    desc: 'Deep analysis of your prose rhythm, vocabulary, and stylistic patterns from writing samples you provide.',
  },
  {
    label: 'Continuity Memory',
    desc: 'Tracks characters, timelines, relationships, and planted foreshadowing across every chapter.',
  },
  {
    label: 'Beat-Sheet Structure',
    desc: 'Your outline is built on proven narrative frameworks — Save the Cat, the Hero\'s Journey, and more.',
  },
  {
    label: 'Creative Checkpoints',
    desc: 'At key moments, choose from multiple direction options. You stay the author, always.',
  },
  {
    label: 'Bring Your Own Model',
    desc: 'Use your own OpenRouter API key to pick any model. Pay only for what you use.',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        height: '1px',
        background: 'rgba(184,147,90,0.15)',
        maxWidth: '1160px',
        margin: '0 auto',
      }}
    />
  )
}
