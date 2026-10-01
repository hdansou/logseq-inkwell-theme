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

// !important only where core itself uses it or sets the value via a utility class.
export const IMPORTANT_ALLOWED = [
  '.bullet-link-wrap:hover > .bullet-container:not(.typed-list) .bullet',
  '.block-children',
  '.cp__cmdk-search-input',
  '.CodeMirror, pre',
  '.CodeMirror-gutters',
]

export const isChannels = (v) => /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/.test(v)

// WCAG relative luminance and contrast ratio for #rgb / #rrggbb colours.
const luminance = (hex) => {
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
