import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  ROOT, read, rules, declarations, ruleFor, isChannels, tokensUsed, contrast, luminance,
  MAPPING_SELECTOR, LIGHT_SELECTOR, DARK_SELECTOR,
  SHUI_TOKENS, LX_VARS, LS_VARS, DEAD_SELECTORS, IMPORTANT_ALLOWED, TABLE_LIST_INLINE_STYLED, CORE_HOVER_OVERRIDES, RATING_COLOURS, TEXT_PAIRS, over, ICON_COLOURS, hue,
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
  test('tweet embeds get a real height (core sets only min-height 240)', () => {
    const body = rules(base).find((x) => x.selector === '.ls-block iframe.tweet-embed')?.body ?? ''
    assert.match(body, /height:\s*600px/)
    assert.doesNotMatch(body, /min-height|max-height/, 'the core min-height stays; the plugin script sizes the rest')
  })

  test('default-sized videos (inline width 560px) fill the block; resized ones keep their width', () => {
    const find = (sel) => rules(base).find((x) => x.selector === sel)
    const shell = find('.ls-block .video-embed-shell:has(> .video-embed-frame[style*="width: 560px"])')
    assert.ok(shell, 'embed shell rule missing: core makes it inline-flex, so 100% collapses to the iframe default')
    assert.match(shell.body, /display:\s*flex/)
    assert.match(shell.body, /width:\s*100%/)
    assert.match(find('.ls-block .video-embed-frame[style*="width: 560px"]')?.body ?? '', /width:\s*100%\s*!important/)
    assert.match(find('.ls-block video.asset-video[style*="width: 560px"]')?.body ?? '', /width:\s*100%\s*!important;\s*height:\s*auto\s*!important/)
  })

  test('default-sized image assets display at 640px, scaled to fit, aspect kept (core default 250)', () => {
    const r = rules(base).find((x) => x.selector === '.ls-block .asset-container > img[width="250"]')
    assert.ok(r, 'no rule for default-sized images')
    assert.match(r.body, /width:\s*640px/)
    assert.match(r.body, /max-width:\s*100%/)
    assert.match(r.body, /height:\s*auto/)
    assert.ok(!r.body.includes('!important'))
  })

  test('table Name cells wrap and rows grow (core caps rows, wrappers and cells at 33px)', () => {
    const has = (sel, re) => rules(base).some((r) => r.selector.split(/,\s*/).includes(sel) && re.test(r.body))
    const expected = [
      ['.ls-table .ls-table-rows div[data-index]', /height:\s*auto/],
      ['.ls-table .ls-table-rows div[data-index]', /max-height:\s*none/],
      ['.ls-table .ls-table-rows div[data-item-index]', /max-height:\s*none/],
      ['.ls-table .ls-table-row', /max-height:\s*none/],
      ['.ls-table .ls-table-cell', /max-height:\s*none/],
      ['.ls-table .ls-table-row .table-block-title div', /white-space:\s*normal/],
      ['.ls-table-cell .table-block-title > .flex-row', /min-width:\s*0/],
    ]
    assert.deepEqual(expected.filter(([sel, re]) => !has(sel, re)).map(([sel, re]) => `${sel} ${re}`), [])
    const tableRules = rules(base).filter((r) => r.selector.includes('ls-table') && !TABLE_LIST_INLINE_STYLED.includes(r.selector))
    assert.ok(!tableRules.some((r) => r.body.includes('!important')), 'table overrides must win on specificity, not !important')
  })

  test('table row separators are an inset shadow, not a border (a 1px border on a fractional-height row vanishes under zoom)', () => {
    const row = rules(base).find((r) => r.selector === '.ls-table .ls-table-row')?.body ?? ''
    assert.match(row, /border-bottom-color:\s*transparent/)
    assert.match(row, /box-shadow:\s*inset 0 -1px 0 hsl\(var\(--border\)\)/)
    const pinned = rules(base).find((r) => r.selector === '.ls-table .ls-table-row .sticky-columns')?.body ?? ''
    assert.match(pinned, /box-shadow:\s*inset 0 -1px 0 hsl\(var\(--border\)\)/, 'pinned columns paint an opaque background over the row shadow')
  })

  test('right sidebar top bar buttons sit on the bar, not on --ls-secondary-background-color (black pills in dark mode)', () => {
    const r = rules(base).find((x) => x.selector === '.cp__right-sidebar-topbar .cp__right-sidebar-settings-btn:not(:hover)')
    assert.match(r?.body ?? '', /background-color:\s*transparent/)
  })

  test('property chips use the translucent fill, not --ls-secondary-background-color (black pills in dark mode)', () => {
    const sel = '.ls-block .positioned-properties.block-below :is(.bottom-property-pill, .bottom-property-control-btn, .bottom-property-control-btn:hover)'
    assert.match(rules(base).find((r) => r.selector === sel)?.body ?? '', /background-color:\s*var\(--ink-fill-strong\)/)
  })

  test('the table list grows with its rows (core fixes it at rows x 33px, so taller rows overflow under "+ New")', () => {
    const body = (sel) => rules(base).find((r) => r.selector === sel)?.body ?? ''
    assert.match(body(TABLE_LIST_INLINE_STYLED[0]), /height:\s*auto\s*!important/)
    assert.match(body(TABLE_LIST_INLINE_STYLED[1]), /position:\s*relative\s*!important/)
    assert.match(body(TABLE_LIST_INLINE_STYLED[1]), /height:\s*auto\s*!important/)
  })

  test('block rows keep title and tag chips side by side down to 360px (core stacks below 600px)', () => {
    const row = rules(base).find((r) => r.selector === '.ls-block .block-row' && /flex-direction:\s*row/.test(r.body))
    assert.ok(row, 'no .ls-block .block-row { flex-direction: row } rule')
    const m = /@container \(max-width:\s*(\d+)px\)\s*\{\s*\.ls-block \.block-row\s*\{[^}]*flex-direction:\s*column/.exec(base)
    assert.ok(m, 'no narrow @container rule stacking .ls-block .block-row')
    assert.ok(Number(m[1]) <= 400, `stacks at ${m[1]}px; expected <= 400px`)
  })

  describe('fonts', () => {
    const faces = rules(base).filter((r) => r.selector === '@font-face')
    const family = (r) => /font-family:\s*"([^"]+)"/.exec(r.body)?.[1]
    const stack = /--ls-font-family:\s*([^;]+);/.exec(ruleFor(base, MAPPING_SELECTOR)?.body ?? '')?.[1] ?? ''

    test('text is Atkinson Hyperlegible Next, then the icon fonts, then system fonts', () => {
      const names = stack.split(',').map((s) => s.trim().replace(/"/g, ''))
      assert.deepEqual(names.slice(0, 4), ['Atkinson Hyperlegible Next', 'tabler-icons', 'Tabler Icons PUA', 'Symbols Nerd Font Mono'])
      assert.ok(names.includes('-apple-system') && names.includes('system-ui'), 'no system fallback for offline use')
    })

    const codeStack = /font-family:\s*([^;]+);/.exec(ruleFor(base, '.CodeMirror, pre, code, :not(pre) > code')?.body ?? '')?.[1] ?? ''

    test('code is Cascadia Code: an installed NF build first, else the web font plus the Nerd Font symbols', () => {
      const names = codeStack.split(',').map((s) => s.trim().replace(/"/g, ''))
      assert.deepEqual(names.slice(0, 3), ['Cascadia Code NF', 'Cascadia Code', 'Symbols Nerd Font Mono'])
      assert.equal(names.at(-1), 'monospace')
    })

    test('code has ligatures: letter-spacing 0 (the body value is inherited, and any spacing turns ligatures off)', () => {
      const body = ruleFor(base, '.CodeMirror, pre, code, :not(pre) > code')?.body ?? ''
      assert.match(body, /letter-spacing:\s*0;/)
      assert.match(body, /font-variant-ligatures:\s*contextual/)
    })

    test('every declared face is in a stack', () => {
      assert.ok(faces.length > 0, 'no @font-face rules')
      assert.deepEqual([...new Set(faces.map(family))].filter((f) => !(stack + codeStack).includes(`"${f}"`)), [])
    })

    test('faces load by URL from jsDelivr at a pinned version, and swap in (custom.css and iOS have no plugin files)', () => {
      for (const r of faces) {
        const urls = [...r.body.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1])
        assert.ok(urls.length > 0, `${family(r)}: no url()`)
        for (const u of urls) assert.match(u, /^https:\/\/cdn\.jsdelivr\.net\/(npm|gh)\/[^@]*(@[\w-]+\/)?[^@]*@v?\d+\.\d+\.\d+\//, `${u} is not pinned`)
        assert.match(r.body, /font-display:\s*swap/, `${family(r)}: no font-display: swap`)
      }
      assert.ok(!/@import/.test(base), '@import only works at the top of a stylesheet; use @font-face')
    })

    test('icon faces only cover the private use areas (tabler also maps a-z and 0-9)', () => {
      const icons = faces.filter((r) => !['Atkinson Hyperlegible Next', 'Cascadia Code'].includes(family(r)))
      assert.deepEqual(icons.map(family).sort(), ['Symbols Nerd Font Mono', 'Tabler Icons PUA'])
      for (const r of icons) {
        const ranges = /unicode-range:\s*([^;]+);/.exec(r.body)?.[1].split(',').map((s) => s.trim()) ?? []
        assert.ok(ranges.length > 0, `${family(r)}: no unicode-range`)
        assert.deepEqual(ranges.filter((x) => !['U+E000-F8FF', 'U+F0000-FFFFD'].includes(x)), [])
      }
    })
  })

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

    for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
      const step = (p, n) => palette[`--ink-${p}${String(n).padStart(2, '0')}`]

      test(`grey scale steps 03-12 run steadily from page to text in ${mode} mode`, () => {
        const lum = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => luminance(step('g', n)))
        const ok = lum.every((v, i) => i === 0 || (mode === 'dark' ? v > lum[i - 1] : v < lum[i - 1]))
        assert.ok(ok, `--ink-g03..12 not monotonic in ${mode}: ${lum.map((v) => v.toFixed(3))}`)
      })

      test(`hover steps --lx-gray-04/05 stand out on the popover in ${mode} mode`, () => {
        // core paints hovered/focused rows on popovers with --lx-gray-04 (shui.css) and --lx-gray-05 (common.css)
        for (const n of [4, 5]) {
          const ratio = contrast(step('g', n), palette['--ink-float'])
          assert.ok(ratio >= 1.25, `--ink-g0${n} vs --ink-float ${ratio.toFixed(2)} < 1.25`)
        }
      })

      test(`accent tints 01-02 move away from the page, not into it, in ${mode} mode`, () => {
        // core uses bg-accent-01/02 as hover fills (ghost buttons, themes dialog): in dark mode they must be lighter
        // than the page, in light mode darker, and visible against it
        for (const n of [1, 2]) {
          const a = step('a', n)
          const away = mode === 'dark' ? luminance(a) > luminance(palette['--ink-surface']) : luminance(a) < luminance(palette['--ink-surface'])
          assert.ok(away, `--ink-a0${n} (${a}) is on the wrong side of --ink-surface in ${mode}`)
          assert.ok(contrast(a, palette['--ink-surface']) >= 1.08, `--ink-a0${n} too close to the page`)
        }
      })
    }

    for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
      test(`text meets WCAG AA (4.5:1) on every surface it sits on in ${mode} mode`, () => {
        const failures = TEXT_PAIRS.flatMap(([fg, bg, base]) => {
          const back = base ? over(palette[`--ink-${bg}`], palette[`--ink-${base}`]) : palette[`--ink-${bg}`]
          const ratio = contrast(palette[`--ink-${fg}`], back)
          return ratio >= 4.5 ? [] : [`${fg} on ${bg}${base ? ` over ${base}` : ''}: ${ratio.toFixed(2)}`]
        })
        assert.deepEqual(failures, [])
      })
    }

    for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
      test(`icon colours meet WCAG 3:1 on the page and on their callout fill in ${mode} mode`, () => {
        const failures = ICON_COLOURS.flatMap((c) => ['surface', `${c}-soft`].map((bg) => [c, bg, contrast(palette[`--ink-${c}`], palette[`--ink-${bg}`])]))
          .filter(([, , ratio]) => ratio < 3).map(([c, bg, ratio]) => `${c} on ${bg}: ${ratio.toFixed(2)}`)
        assert.deepEqual(failures, [])
      })

      test(`pink and red highlights are distinct hues in ${mode} mode`, () => {
        assert.ok(palette['--ink-hl-pink'], 'palette must define --ink-hl-pink')
        const d = Math.abs(hue(palette['--ink-hl-pink']) - hue(palette['--ink-hl-red']))
        assert.ok(Math.min(d, 360 - d) >= 20, `hue difference ${Math.min(d, 360 - d).toFixed(0)}° < 20°`)
      })
    }

    test('the pink block background uses its own token', () => {
      assert.equal(mapping['--ls-highlight-color-pink'], 'var(--ink-hl-pink)')
    })

    describe('flashcard rating buttons', () => {
      const declOf = (id) => Object.assign({}, ...rules(css).filter((r) => r.selector.split(/,\s*/).includes(`#card-${id}`)).map((r) => declarations(r.body)))

      for (const [id, colour] of Object.entries(RATING_COLOURS)) {
        test(`#card-${id} is ${colour}`, () => {
          const d = declOf(id)
          assert.equal(d['--rating-soft'], `var(--ink-${colour}-soft)`)
          assert.equal(d['--rating-text'], `var(--ink-${colour}-text)`)
        })
      }

      test('one shared rule paints all four from --rating-soft / --rating-text', () => {
        const shared = rules(css).find((r) => /background:\s*var\(--rating-soft\)/.test(r.body) && /color:\s*var\(--rating-text\)/.test(r.body))
        assert.ok(shared, 'no shared rating rule')
        for (const id of Object.keys(RATING_COLOURS)) assert.ok(shared.selector.includes(`#card-${id}`), `shared rule misses #card-${id}`)
      })

      test('the "Show answer" button (#card-answers) stays neutral', () => {
        assert.ok(!rules(css).some((r) => r.selector.includes('#card-answers')))
      })

      for (const [mode, palette] of [['light', light], ['dark', { ...light, ...dark }]]) {
        test(`rating text meets WCAG AA on its fill in ${mode} mode`, () => {
          for (const colour of Object.values(RATING_COLOURS)) {
            const ratio = contrast(palette[`--ink-${colour}-text`], palette[`--ink-${colour}-soft`])
            assert.ok(ratio >= 4.5, `${colour}: ${ratio.toFixed(2)} < 4.5`)
          }
        })
      }
    })

    test('overrides every core hover rule that paints rows as dark as the popover', () => {
      const painted = rules(css).filter((r) => /background:\s*var\(--ink-hover\)/.test(r.body))
        .flatMap((r) => r.selector.split(/,\s*/))
      assert.deepEqual(CORE_HOVER_OVERRIDES.filter((sel) => !painted.includes(sel)), [])
    })

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

  test('main (tweet sizing script) exists, pins its library with integrity, and only trusts the Twitter embed origin', async () => {
    assert.equal(pkg.logseq.main, 'index.html')
    const html = await read('index.html')
    assert.match(html, /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@logseq\/libs@\d+\.\d+\.\d+\/dist\/lsplugin\.user\.js" integrity="sha384-[A-Za-z0-9+/=]+"/)
    assert.match(html, /e\.origin !== 'https:\/\/platform\.twitter\.com'/)
    assert.match(html, /frame\.contentWindow === e\.source/)
  })

  test('is a marketplace-shaped theme package', () => {
    assert.match(pkg.name, /^[a-z0-9-]+$/)
    for (const k of ['version', 'description', 'author', 'license']) assert.ok(pkg[k], `missing ${k}`)
    assert.equal(pkg.logseq.id, pkg.name)
  })

  const readmeImages = async () => [...(await read('README.md')).matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1])
  const shotsDir = path.join(ROOT, 'assets/screenshots')
  const shots = existsSync(shotsDir) ? readdirSync(shotsDir).map((f) => `assets/screenshots/${f}`) : []

  // the release zip ships assets/screenshots whole: every file there must be one the README shows, and vice versa
  test('README images and assets/screenshots agree', async () => {
    const images = await readmeImages()
    assert.deepEqual(shots.filter((f) => !images.includes(f)), [], 'screenshots the README does not show')
    assert.deepEqual(images.filter((f) => f.startsWith('assets/screenshots/') && !shots.includes(f)), [], 'README images that do not exist')
  })

  // a new theme starts without screenshots: TODO until then; tools/package.sh refuses to build a release without them
  test('README shows light and dark screenshots (marketplace requires an image)', { todo: shots.length ? false : 'take light and dark screenshots before the first release' }, async () => {
    const images = await readmeImages()
    for (const mode of ['light', 'dark']) assert.ok(images.some((p) => p.includes(mode) && existsSync(path.join(ROOT, p))), `README has no ${mode} screenshot`)
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
