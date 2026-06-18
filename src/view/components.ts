import { type Html, html } from 'foldkit/html'

// Shared Tailwind class strings + small building blocks reused across views.

export const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer'

export const ghostButtonClass =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer'

export const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'

export type Tone = 'muted' | 'danger'

export const badge = <Msg>(text: string, tone: Tone = 'muted'): Html => {
  const h = html<Msg>()
  const toneClass =
    tone === 'danger'
      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return h.span(
    [h.Class(`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`)],
    [text],
  )
}

export const spinner = <Msg>(): Html => {
  const h = html<Msg>()
  return h.span(
    [
      h.Class(
        'inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500',
      ),
    ],
    [],
  )
}

export const surfaceClass =
  'rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4'
