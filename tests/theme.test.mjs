import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  ROOT, read, rules, declarations, ruleFor, isChannels, tokensUsed, contrast,
  MAPPING_SELECTOR, LIGHT_SELECTOR, DARK_SELECTOR,
  SHUI_TOKENS, LX_VARS, LS_VARS, DEAD_SELECTORS, IMPORTANT_ALLOWED,
} from './_lib.mjs'
import { variants, buildVariant, themeEntries, themePath, checkMeta } from '../build.mjs'

const VARIANTS = await variants()
const base = await read('src/base.css')

/** Follow var(--x) through the palette of one mode down to a literal value. */
const resolve = (value, palette) => {
  let v = value
  for (let i = 0; i < 5; i++) {
    const m = /^var\((--[\w-]+)\)$/.exec(v)
    if (!m) return v
    v = palette[m[1]]
    if (v === undefined) return undefined
  }
  return v
}

describe('palette metadata (copied into the CSS header comment and package.json)', () => {
  test('accepts plain names and descriptions', () => {
    assert.equal(checkMeta('Deep slate and oxblood on Apple system greys', 'description'), 'Deep slate and oxblood on Apple system greys')
    assert.equal(checkMeta("Blue & ink, no. 2 (cool) — muted", 'description'), "Blue & ink, no. 2 (cool) — muted")
  })
  for (const bad of ['Mono */ body { display: none } /*', 'a\\2f', 'x{y}', '<script>', '"quoted"', 'back`tick']) {
    test(`rejects ${JSON.stringify(bad)}`, () => {
      assert.throws(() => checkMeta(bad, 'variant'), /@variant/)
    })
  }
})

test('there is at least one variant, and slate is one of them', () => {
  assert.ok(VARIANTS.some((v) => v.id === 'slate'), `variants: ${VARIANTS.map((v) => v.id)}`)
})

describe('src/base.css', () => {
  test('holds no palette: no colour literals outside the variable mapping', () => {
    const coloured = rules(base)
      .filter((r) => r.selector !== MAPPING_SELECTOR)
      .filter((r) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(\d/i.test(r.body))
    assert.deepEqual(coloured.map((r) => r.selector), [])
  })
})

for (const variant of VARIANTS) {
  describe(`variant ${variant.id}`, async () => {
    const css = await read(themePath(variant.id))
    const light = declarations(ruleFor(css, LIGHT_SELECTOR)?.body ?? '')
    const dark = declarations(ruleFor(css, DARK_SELECTOR)?.body ?? '')
    const mapping = declarations(ruleFor(css, MAPPING_SELECTOR)?.body ?? '')

    test('the committed theme file matches a fresh build (run `npm run build`)', async () => {
      assert.equal(css, await buildVariant(variant.id))
    })

    test('light tokens live on :root and dark overrides on html[data-theme="dark"]', () => {
      assert.ok(Object.keys(light).length > 0, `no ${LIGHT_SELECTOR} rule`)
      assert.ok(Object.keys(dark).length > 0, `no ${DARK_SELECTOR} rule`)
    })

    test('dark mode overrides every light token (no mode leaks)', () => {
      assert.deepEqual(Object.keys(light).filter((k) => !(k in dark)), [])
    })

    test('the palette defines every --ink-* token that base.css uses', () => {
      assert.deepEqual(tokensUsed(base).filter((t) => !(t in light)), [])
    })

    for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
      test(`highlighted rows stand out on floating surfaces in ${mode} mode`, () => {
        // Menus, selects and the palette paint the hovered/chosen row with --ink-hover on --ink-float.
        assert.ok(palette['--ink-hover'], 'palette must define --ink-hover')
        const ratio = contrast(palette['--ink-hover'], palette['--ink-float'])
        assert.ok(ratio >= 1.3, `--ink-hover vs --ink-float contrast ${ratio.toFixed(2)} < 1.3`)
      })
    }

    test('only light/dark activation — Logseq never sets a custom data-theme name', () => {
      const names = [...css.matchAll(/data-theme="([^"]+)"/g)].map((m) => m[1])
      assert.deepEqual([...new Set(names)].filter((n) => n !== 'light' && n !== 'dark'), [])
    })

    test(`maps variables on "${MAPPING_SELECTOR}" so they beat core's [data-color] rules`, () => {
      assert.ok(Object.keys(mapping).length > 0, 'mapping rule missing')
    })

    for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
      test(`shui tokens resolve to bare HSL channels in ${mode} mode`, () => {
        for (const t of SHUI_TOKENS) {
          assert.ok(t in mapping, `missing ${t}`)
          const v = resolve(mapping[t], palette) ?? mapping[t]
          assert.ok(isChannels(v), `${t} resolves to "${v}" — must be "H S% L%", never hex or hsl()`)
        }
      })
    }

    test('defines the full --lx-gray / --lx-accent scales (read before any --ls-* fallback)', () => {
      for (const v of LX_VARS) assert.ok(v in mapping, `missing ${v}`)
    })

    test('defines the classic --ls-* variables and all highlight colours', () => {
      for (const v of LS_VARS) assert.ok(v in mapping, `missing ${v}`)
    })

    test('sets --left-sidebar-bg-color on main.theme-container-inner, where core defines it', () => {
      const r = ruleFor(css, 'main.theme-container-inner')
      assert.ok(r && '--left-sidebar-bg-color' in declarations(r.body))
    })

    test('uses no selectors that are dead in DB builds', () => {
      const found = rules(css).flatMap((r) =>
        DEAD_SELECTORS.filter((re) => re.test(r.selector)).map((re) => `${re} in "${r.selector}"`))
      assert.deepEqual(found, [])
    })

    test('!important only in the allowed places', () => {
      const bad = rules(css).filter((r) => r.body.includes('!important') && !IMPORTANT_ALLOWED.includes(r.selector))
      assert.deepEqual(bad.map((r) => r.selector), [])
    })

    test('braces are balanced', () => {
      assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length)
    })
  })
}

describe('package.json', async () => {
  const pkg = JSON.parse(await read('package.json'))

  test('is a marketplace-shaped theme package', () => {
    assert.match(pkg.name, /^[a-z0-9-]+$/)
    for (const k of ['version', 'description', 'author', 'license']) assert.ok(pkg[k], `missing ${k}`)
    assert.equal(pkg.logseq.id, pkg.name)
  })

  test('the marketplace manifest agrees with package.json', async () => {
    const m = JSON.parse(await read('marketplace/manifest.json'))
    assert.equal(m.title, pkg.logseq.title)
    assert.equal(m.description, pkg.description)
    assert.equal(m.theme, true)
    assert.equal(m.supportsDBOnly, true, 'DB graphs only: the selectors target the DB UI')
    assert.ok(!('effect' in m), 'a theme-only package needs no effect sandbox')
    if (pkg.repository) {
      const repo = /github\.com[/:]([^/]+\/[^/.]+)/.exec(pkg.repository.url ?? pkg.repository)?.[1]
      assert.equal(m.repo, repo, 'manifest repo must match package.json repository')
    }
  })

  test('registers every variant in light and dark, matching a fresh build (run `npm run build`)', async () => {
    assert.deepEqual(pkg.logseq.themes, await themeEntries())
    for (const t of pkg.logseq.themes) assert.ok(existsSync(path.join(ROOT, t.url)), `${t.url} does not exist`)
  })
})
