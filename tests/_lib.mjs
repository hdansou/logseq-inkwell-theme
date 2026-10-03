// Zero-dependency helpers for structural theme tests.
// The CSS is flat (no nesting, no @media), so a small rule splitter is enough.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export const read = (relPath) => readFile(path.join(ROOT, relPath), 'utf8')

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** [{selector, body}] for every top-level rule. */
export const rules = (css) =>
  [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    selector: sel.trim().replace(/\s+/g, ' '),
    body,
  }))

/** Map of custom property → value declared in a rule body. */
export const declarations = (body) =>
  Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  )

export const ruleFor = (css, selector) => rules(css).find((r) => r.selector === selector)

export const scale = (prefix) =>
  Array.from({ length: 12 }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`)

// ---------- the contract ----------

// Core declares --ls-* on html[data-theme=X][data-color=logseq] (0,2,1) and, for other
// accent colours, shui tokens on body/.light-theme/.dark-theme. The mapping must beat both.
export const MAPPING_SELECTOR = 'html[data-theme][data-color], html[data-theme][data-color] body'
export const LIGHT_SELECTOR = ':root'
export const DARK_SELECTOR = 'html[data-theme="dark"]'

// Consumed as hsl(var(--x)) by Tailwind/shui: must resolve to bare "H S% L%" channels.
export const SHUI_TOKENS = [
  '--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground',
  '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted',
  '--muted-foreground', '--accent', '--accent-foreground', '--destructive',
  '--destructive-foreground', '--border', '--input', '--ring',
]

// Core reads these before any --ls-* fallback.
export const LX_VARS = [
  ...scale('--lx-gray-'),
  ...scale('--lx-accent-'),
  '--lx-gray-03-alpha', '--lx-gray-04-alpha', '--lx-gray-05-alpha', '--lx-gray-06-alpha',
  '--lx-accent-07-alpha',
]

export const LS_VARS = [
  '--ls-primary-background-color', '--ls-secondary-background-color',
  '--ls-tertiary-background-color', '--ls-quaternary-background-color',
  '--ls-primary-text-color', '--ls-secondary-text-color', '--ls-title-text-color',
  '--ls-link-text-color', '--ls-link-ref-text-color', '--ls-tag-text-color',
  '--ls-block-bullet-color', '--ls-block-highlight-color', '--ls-selection-background-color',
  '--ls-page-mark-bg-color', '--ls-page-inline-code-bg-color', '--ls-page-blockquote-bg-color',
  '--ls-border-color', '--ls-guideline-color', '--ls-focus-ring-color',
  ...['yellow', 'red', 'pink', 'green', 'blue', 'purple', 'gray'].map((c) => `--ls-highlight-color-${c}`),
]

// Selectors from older Logseq builds that match nothing in DB builds (Base UI, not Radix).
export const DEAD_SELECTORS = [
  /data-radix/, /\.tippy-box/, /\.preview-ref-wrap/, /\.cp__palette/, /\.cp__cmdk-item/,
  /\.rdp-day_/, /\.ui__modal-/, /data-bg-color/, /\.marker-switch/, /\.block-properties/,
  /\.page-properties/, /data-variant/, /\.editor-inner\.h\d/, /html\.dark/,
]

// Every token a component rule in src/base.css may use comes from the palette.
export const TOKEN_PREFIX = '--ink-'
export const tokensUsed = (css) =>
  [...new Set([...stripComments(css).matchAll(/var\((--ink-[\w-]+)\)/g)].map((m) => m[1]))].sort()

// Core hover/active rules that paint rows with --lx-gray-04 or --lx-accent-01. In dark mode those
// steps are as dark as, or darker than, the popover, so the highlight disappears. Each must be
// matched (same or higher specificity) by a rule painting --ink-hover. Selectors are written
// as they appear in base.css.
export const CORE_HOVER_OVERRIDES = [
  // resources/css/shui.css: html:not([data-color=logseq]) .ui__dropdown-menu-item:focus (0,3,1)
  'html:not([data-color=logseq]) .ui__dropdown-menu-item:focus',
  'html:not([data-color=logseq]) .ui__dropdown-menu-item.is-active',
  // resources/css/shui.css: html:not([data-color=logseq]) .cp__themes-installed .it:hover (0,4,1)
  'html[data-theme] .cp__themes-installed .it:hover',
  'html[data-theme] .cp__themes-installed .it.is-active',
  // common.css / select.cljs: chosen rows in filter lists and autocomplete
  '#ui__ac-inner .menu-link.chosen',
  '.dark .cp__select-main .menu-link.chosen',
]

// Flashcard rating buttons (#card-<rating>, fsrs.cljs) get the palette's soft fill + text colour.
// Anki convention: failure red, struggle orange, pass green, easy blue.
export const RATING_COLOURS = { again: 'red', hard: 'orange', good: 'green', easy: 'blue' }

// !important only where core itself uses it or sets the value via a utility class.
// react-virtuoso writes the table list's heights inline (views.cljs :fixed-item-height)
export const TABLE_LIST_INLINE_STYLED = ['.ls-table .ls-table-rows [data-virtuoso-scroller]', '.ls-table .ls-table-rows [data-viewport-type]']

export const IMPORTANT_ALLOWED = [
  ...TABLE_LIST_INLINE_STYLED,
  '.bullet-link-wrap:hover > .bullet-container:not(.typed-list) .bullet',
  '.block-children',
  '.cp__cmdk-search-input',
  '.CodeMirror, pre',
  '.CodeMirror-gutters',
  // core sizes videos with an inline width (block.cljs video-embed-cp, asset-video-style)
  '.ls-block .video-embed-frame[style*="width: 560px"]',
  '.ls-block video.asset-video[style*="width: 560px"]',
]

export const isChannels = (v) => /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/.test(v)

// WCAG relative luminance and contrast ratio for #rgb / #rrggbb colours.
export const luminance = (hex) => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Composite a #rrggbbaa colour over an opaque #rrggbb base; returns #rrggbb. */
export const over = (fg, base) => {
  const h = fg.replace('#', '')
  if (h.length !== 8) return fg
  const a = parseInt(h.slice(6, 8), 16) / 255
  const ch = (hex, i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16)
  return '#' + [0, 2, 4].map((i) => Math.round(ch(h, i) * a + ch(base, i) * (1 - a)).toString(16).padStart(2, '0')).join('')
}

// Text that must meet WCAG AA (4.5:1). Each entry: [text token, background token, base for translucent fills].
// Decorative tokens are exempt: --ink-label-3 (bullets, brackets, link underlines, the cancelled-task icon).
export const TEXT_PAIRS = [
  ...['surface', 'bg', 'sidebar', 'float', 'hover', 'tint-soft'].map((b) => ['label', b]),
  ['label', 'fill', 'surface'],          // code, properties, blockquote
  ['label', 'fill-strong', 'surface'],   // tag pills, secondary buttons
  ...['blue-soft', 'green-soft', 'purple-soft', 'orange-soft', 'red-soft'].map((b) => ['label', b]),  // callouts
  ...['hl-yellow', 'hl-green', 'hl-blue', 'hl-purple', 'hl-red', 'hl-gray'].map((b) => ['label', b]),  // highlights, block backgrounds
  ...['surface', 'sidebar', 'float'].map((b) => ['label-2', b]),  // secondary text, property keys, headers
  ['accent', 'surface'], ['accent', 'float'],  // today in the date picker, cloze
  ['on-tint', 'tint'],                          // primary buttons, Decision callout
  ['label', 'hl-pink'],                         // pink block background
]

// Icon colours need WCAG 3:1 (non-text) on the page and on their callout fill.
// Red (CAUTION icon, 2.95:1 on its fill in light mode) is tracked as T29.
export const ICON_COLOURS = ['green', 'orange']

/** Hue in degrees (0-360) of a #rrggbb colour. */
export const hue = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
