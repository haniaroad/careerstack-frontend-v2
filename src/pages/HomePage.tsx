import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-600">CareerStack</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">
        Platform foundation
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-700">
        Frontend scaffold is live. Product shell arrives in a later change.
      </p>
      <Link
        to="/status"
        className="mt-8 inline-flex w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Check API health
      </Link>
    </main>
  )
}
