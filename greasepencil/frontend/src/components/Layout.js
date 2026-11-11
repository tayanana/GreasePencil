import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';

const links = [
  { to: '/', label: 'Board', end: true },
  { to: '/garage', label: 'Garage' },
  { to: '/parts', label: 'Parts' },
];

export default function Layout() {
  const [viewer, setViewer] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('/api/me')
      .then((next) => {
        if (active) setViewer(next);
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) setViewer(null);
        else setError(err.message || 'The garage could not be opened.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="h-1.5 bg-primary" />
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5">
            <Mark />
            <span>
              <span className="block font-serif text-xl leading-none tracking-tight">Greasepencil</span>
              <span className="block text-xs text-muted-foreground">Garage and maintenance</span>
            </span>
          </NavLink>
          <nav aria-label="Primary" className="flex items-center gap-1 sm:ml-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {viewer ? (
            <p className="text-sm text-muted-foreground sm:ml-auto">
              {viewer.kind === 'key' ? `API key: ${viewer.name}` : viewer.name}
            </p>
          ) : null}
        </div>
      </header>
      {viewer?.simulated ? (
        <p className="border-b border-border bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">
          Local workshop mode. This preview uses a simulated viewer named {viewer.name}. It is not a real sign-in.
          A published private or team copy uses the Cursor account that opens it.
        </p>
      ) : null}
      <main id="content" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {error ? <p role="alert">{error}</p> : null}
        {viewer === undefined && !error ? <p className="text-muted-foreground">Opening the bay…</p> : null}
        {viewer === null ? <SignedOut /> : null}
        {viewer ? <Outlet context={{ viewer }} /> : null}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm text-muted-foreground">
        Intervals are the ones you set. Sample part numbers are catalogue cross-references. Confirm the engine stamp,
        steering side, and climate system before you buy anything.
      </footer>
    </div>
  );
}

function SignedOut() {
  return (
    <section className="max-w-xl rounded-2xl border border-border bg-card p-6">
      <h1 className="font-serif text-3xl">Sign in to open the garage</h1>
      <p className="mt-3 text-muted-foreground">
        Greasepencil keeps each viewer&apos;s vehicles separate. Open a published private or team copy while signed in to Cursor.
        On this machine, the API should already be using the simulated local viewer.
      </p>
    </section>
  );
}

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#1c1915" />
      <path d="M9 22.2 20.6 9.6l2.1 2.1L11.1 24.3H9v-2.1z" fill="#f4e2c4" />
      <path d="M19.4 8.6 21.2 6.8l3.1 3.1-1.8 1.8-3.1-3.1z" fill="#c2410c" />
    </svg>
  );
}
