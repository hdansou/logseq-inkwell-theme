# Design and variable mapping

## Slate palette

Defined in `src/palettes/slate.css`.

| Token                       | Light                             | Dark                              | Role                                               |
| --------------------------- | --------------------------------- | --------------------------------- | -------------------------------------------------- |
| `--ink-surface`             | `#ffffff`                         | `#1c1c1e`                         | page, editor                                       |
| `--ink-bg`                  | `#f5f5f7`                         | `#000000`                         | secondary background                               |
| `--ink-sidebar`             | `#f2f2f5`                         | `#161618`                         | left sidebar                                       |
| `--ink-float`               | `#ffffff`                         | `#2c2c2e`                         | popovers, dialogs, palette                         |
| `--ink-label` / `-2` / `-3` | `#1d1d1f` / `#6e6e73` / `#aeaeb2` | `#f5f5f7` / `#98989d` / `#636366` | text, secondary text, tertiary (bullets, brackets) |
| `--ink-line` / `-soft`      | `#d2d2d7` / `#e8e8ed`             | `#38383a` / `#2c2c2e`             | borders, guide lines                               |
| `--ink-fill` / `-strong`    | 8% / 12% grey                     | 18% / 28% grey                    | code, properties, tag pills                        |
| `--ink-tint`                | `#223b3b`                         | `#b3c6c6`                         | primary (buttons, selected day, Decision callout)  |
| `--ink-tint-soft`           | `#dfe8e8`                         | `#213232`                         | selection, highlighted rows, active sidebar item   |
| `--ink-accent`              | `#9c2529`                         | `#e8878a`                         | today, cloze                                       |

System colours (green, orange, red, blue, purple) each come as a full colour, a `-text` variant and a `-soft` background, and drive the callouts and task icons. Highlight colours (`--ink-hl-*`) drive `==highlight==` and the block background colours.

## How the tokens reach Logseq

Logseq reads three layers of variables, and a theme has to set all three:

1. **shui/Tailwind tokens** (`--background`, `--primary`, `--popover`, `--border`, `--ring`, …). Consumed as `hsl(var(--primary))`, so they **must be bare channels** (`180 27% 18%`). A hex value makes `hsl(#…)` invalid and blanks every dialog, menu and button. The palette carries channel copies (`--ink-c-*`) for this.
2. **Radix-style scales** `--lx-gray-01…12` and `--lx-accent-01…12`, plus the `-alpha` steps core uses. Core reads these **before** any `--ls-*` fallback: page links and tags use `--lx-accent-11`, bullets `--lx-gray-08`, guide lines `--lx-gray-04-alpha`, the properties background `--lx-gray-03`.
3. **Classic `--ls-*`** variables, still the source for text colours, highlights (`--ls-highlight-color-<name>` is what the DB background-colour property uses), blockquotes and inline code.

**Where they are declared matters.** Core defines `--ls-*` on `html[data-theme=X][data-color=logseq]` (specificity 0,2,1), and non-default accent colours set shui tokens on `body`. A mapping on `:root` loses to both. The mapping is therefore declared on:

```css
html[data-theme][data-color], html[data-theme][data-color] body { … }
```

The palette itself sits on `:root` (light) and `html[data-theme="dark"]` (dark). Since the mapping only points at `--ink-*` tokens, one file serves both modes.

The left sidebar's background is `--left-sidebar-bg-color`, which core defines on `main.theme-container-inner`, so it is overridden there.

## Block layout

Core stacks a block's title above its tag chips whenever the block is narrower than 600px (`@container` in core `block.css`), which hits hover previews, the right sidebar and nested blocks. Inkwell keeps them side by side down to 360px and stacks below that.

## Table view

Core caps every table row, row wrapper and cell at 33px with overflow hidden, and its virtual list assumes 33px rows. Inkwell lets the Name cell wrap and rows grow: the list still lays rows out in normal flow, so taller rows push the next ones down. Verified on a 155-row table. Known quirk: a jump straight from the top to the bottom of a long table can land about two rows short until the list re-measures; one more scroll reaches the end.

## Images

Core shows an image that has no saved size at 250px. Inkwell shows those at 640px, never wider than the block, keeping the aspect ratio. Images resized by dragging keep their own width. Known: the loading placeholder is still 250px, so a default image grows to 640px once loaded; an image deliberately resized to exactly 250px also shows at 640px.

## Videos

Core gives embeds (`.video-embed-frame`) and uploaded videos (`video.asset-video`) an inline width, 560px by default. Inkwell makes default-sized ones fill the block: embeds keep core's inline 16:9 aspect ratio, uploaded videos their own. The embed's wrapper (`.video-embed-shell`) is `inline-flex` in core, so it is stretched too, otherwise 100% collapses to the iframe's 300px default. Resizing writes `w=…` into the macro, and that width is kept. Inline styles need `!important` (listed in the tests' allowlist).

Note: app.logseq.com currently serves older embed markup (`iframe.aspect-video`, before core #12782), so test video changes in the desktop app.

## Flashcard ratings

| Button (`id`) | Colour | Fill / text tokens |
|---|---|---|
| Again (`#card-again`) | red | `--ink-red-soft` / `--ink-red-text` |
| Hard (`#card-hard`) | orange | `--ink-orange-soft` / `--ink-orange-text` |
| Good (`#card-good`) | green | `--ink-green-soft` / `--ink-green-text` |
| Easy (`#card-easy`) | blue | `--ink-blue-soft` / `--ink-blue-text` |

Anki convention. "Show answer" (`#card-answers`) stays neutral. Each text/fill pair must meet WCAG AA (4.5:1) in both modes; the tests check every palette.

## Where !important is used

Only where core itself uses it, or sets the value through a Tailwind class:

- bullet hover colour
- the `.block-children` guide line
- the command palette input size
- `.CodeMirror` / `pre` backgrounds
- the CodeMirror gutter
- default-sized videos (core sets their width inline)

The tests enforce this list.

## Adding a variant

1. Copy `src/palettes/slate.css` to `src/palettes/<id>.css` and set its `@variant` name and `@description`.
2. Change the values. Keep every token name: `src/base.css` uses them all, and the tests check each palette defines every token in light and dark. The `--ink-c-*` tokens are the same colours written as HSL channels (`H S% L%`) for the shui layer. The `--ink-g01…12` and `--ink-a01…12` steps are the grey and accent scales.
   The scales have rules the tests enforce, because Logseq paints its own hover and active states with them:
   - grey 03→12 runs steadily from the page colour towards the text colour;
   - grey 04 and 05 are at least 1.25:1 against `--ink-float` (core uses them for hovered rows on popovers);
   - accent 01 and 02 sit on the far side of the page from the popover: lighter than `--ink-surface` in dark mode, darker in light mode (core uses them for ghost-button and list hovers);
   - `--ink-hover` is at least 1.3:1 against `--ink-float`;
   - icon colours (`ICON_COLOURS`) meet 3:1 on the page and on their callout fill;
   - `--ink-hl-pink` and `--ink-hl-red` differ in hue by at least 20°;
   - every text colour meets WCAG AA (4.5:1) on each surface it sits on (`TEXT_PAIRS` in `tests/_lib.mjs`). `--ink-label-3` is decorative and exempt.
3. `npm run build`: this writes `themes/inkwell-<id>.css` and registers "Inkwell <Name> Light/Dark" in `package.json`.
4. `npm test`, then `npm run lab -- --variant <id>` for a human pass.

Component styling lives only in `src/base.css`. If a variant needs a different look rather than different colours, add a token for it to every palette instead of a variant-specific rule.
