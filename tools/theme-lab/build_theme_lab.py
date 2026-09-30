#!/usr/bin/env python3
"""Generate theme-lab.edn: a Logseq DB graph for human theme testing.

Import:  logseq graph create --graph Theme-Lab
         logseq graph import --graph Theme-Lab --type edn --input theme-lab.edn
The chosen variant (../../themes/inkwell-<variant>.css, default slate; set LAB_VARIANT) is embedded
as the graph file logseq/custom.css.
"""
import os
import pathlib
import re
import uuid

HERE = pathlib.Path(__file__).parent
VARIANT = os.environ.get("LAB_VARIANT", "slate")
CSS = (HERE.parent.parent / "themes" / f"inkwell-{VARIANT}.css").read_text()


# ---------- tiny EDN writer ----------
class K(str):
    """EDN keyword."""


class ESet(list):
    """EDN set (list-backed so it can hold maps)."""


class _Deferred(str):
    """Block text whose [[Title]] links are resolved at write time, after all ids are known."""


class Tagged:
    def __init__(self, tag, val):
        self.tag, self.val = tag, val


def edn(x, ind=0):
    pad = " " * ind
    if isinstance(x, K):
        return ":" + x
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, (int, float)):
        return repr(x)
    if x is None:
        return "nil"
    if isinstance(x, _Deferred):
        x = link_refs(str(x))
    if isinstance(x, str):
        return '"' + x.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    if isinstance(x, Tagged):
        return f"#{x.tag} {edn(x.val)}"
    if isinstance(x, uuid.UUID):
        return f'#uuid "{x}"'
    if isinstance(x, dict):
        items = [f"{edn(k)} {edn(v, ind + 1)}" for k, v in x.items()]
        return "{" + ("\n" + pad + " ").join(items) + "}"
    if isinstance(x, (set, ESet)):
        return "#{" + " ".join(edn(v, ind + 2) for v in x) + "}"
    if isinstance(x, (list, tuple)):
        return "[" + ("\n" + pad + " ").join(edn(v, ind + 1) for v in x) + "]"
    raise TypeError(type(x))


def kw(s):
    return K(s)


# ---------- ids ----------
# Every page and tag gets a deterministic uuid so [[Title]] in text can be rewritten to [[uuid]]:
# in DB graphs only [[uuid]] is a real ref (named [[Title]] is stored as plain text, no backlink).
NS = uuid.UUID("6a000000-0000-4000-8000-000000000000")
IDS = {}


def uid_for(title):
    return IDS.setdefault(title, uuid.uuid5(NS, title))


def link_refs(text):
    def sub(m):
        inner = m.group(1)
        if inner in IDS:
            return f"[[{IDS[inner]}]]"
        return m.group(0)
    return re.sub(r"\[\[([^\]]+)\]\]", sub, text)


# ---------- helpers ----------
def b(title, *children, props=None, tags=None, **extra):
    m = {kw("block/title"): _Deferred(title)}
    if props:
        m[kw("build/properties")] = {kw(k): v for k, v in props.items()}
    if tags:
        m[kw("build/tags")] = [kw(t) for t in tags]
    for k, v in extra.items():
        m[kw(k.replace("__", "/").replace("_", "-"))] = v
    if children:
        m[kw("build/children")] = list(children)
    return m


def page(title, blocks, props=None, tags=None, uid=None):
    p = {kw("block/title"): title,
         kw("block/uuid"): uid or uid_for(title),
         kw("build/keep-uuid?"): True}
    IDS[title] = p[kw("block/uuid")]
    if props:
        p[kw("build/properties")] = {kw(k): v for k, v in props.items()}
    if tags:
        p[kw("build/tags")] = [kw(t) for t in tags]
    return {kw("page"): p, kw("blocks"): blocks}


def journal(yyyymmdd, blocks, uid=None):
    p = {kw("build/journal"): yyyymmdd}
    if uid:
        p[kw("block/uuid")] = uid
        p[kw("build/keep-uuid?")] = True
    return {kw("page"): p, kw("blocks"): blocks}


def pref(uid):
    """Property value pointing at a page built with a fixed uuid (import doesn't translate [:build/page ...])."""
    return [kw("block/uuid"), uid]


def task(title, status, priority=None, *children, **kwargs):
    props = {"logseq.property/status": kw(f"logseq.property/status.{status}")}
    if priority:
        props["logseq.property/priority"] = kw(f"logseq.property/priority.{priority}")
    return b(title, *children, props=props, tags=["logseq.class/Task"], **kwargs)


def check(title, *hints):
    """A feedback checklist item: a Todo task plus hint children and an empty notes block."""
    return task(title, "todo", None,
                *[b(h) for h in hints],
                b("Notes: ", props={"user.property/area": title}))


REF_TARGET = uuid.UUID("6a000000-0000-4000-8000-00000000a001")
EMBED_TARGET = uuid.UUID("6a000000-0000-4000-8000-00000000a002")
TARGET_PAGE = uuid.UUID("6a000000-0000-4000-8000-00000000b001")
TYPO_PAGE = uuid.UUID("6a000000-0000-4000-8000-00000000b002")
READ_DAY = uuid.UUID("6a000000-0000-4000-8000-00000000b003")
HL = ["yellow", "red", "pink", "green", "blue", "purple", "gray"]

# ---------- schema ----------
properties = {
    kw("user.property/author"): {kw("logseq.property/type"): kw("default"), kw("block/title"): "author"},
    kw("user.property/rating"): {kw("logseq.property/type"): kw("number"), kw("block/title"): "rating"},
    kw("user.property/finished"): {kw("logseq.property/type"): kw("checkbox"), kw("block/title"): "finished"},
    kw("user.property/website"): {kw("logseq.property/type"): kw("url"), kw("block/title"): "website"},
    kw("user.property/related"): {kw("logseq.property/type"): kw("node"), kw("db/cardinality"): kw("db.cardinality/many"),
                                  kw("block/title"): "related"},
    kw("user.property/read-on"): {kw("logseq.property/type"): kw("date"), kw("block/title"): "read on"},
    kw("user.property/area"): {kw("logseq.property/type"): kw("default"), kw("block/title"): "area"},
}
def cls(title, **extra):
    m = {kw("block/title"): title, kw("block/name"): title.lower(),
         kw("block/uuid"): uid_for(title), kw("build/keep-uuid?"): True}
    m.update({kw(k): v for k, v in extra.items()})
    return m


classes = {
    kw("user.class/Book"): cls("Book", **{"build/class-properties": [
        kw("user.property/author"), kw("user.property/rating"), kw("user.property/finished"), kw("user.property/read-on")]}),
    kw("user.class/Person"): cls("Person", **{"build/class-properties": [kw("user.property/website")]}),
    kw("user.class/Idea"): cls("Idea"),
}

# ---------- pages ----------
pages = []

pages.append(page("Theme Lab — Start Here", [
    b("Welcome. This graph exists to test the Inkwell theme (variant: " + VARIANT + "). Every page below exercises one area of the UI.",
      props={"logseq.property/heading": 2}),
    b("How to run a test session",
      b("Open each page in order and compare what you see with the design system."),
      b("Repeat in dark mode: Settings › General › Theme, or type t t outside the editor."),
      b("Try at least one other accent colour: Settings › General › Accent color."),
      b("Record what you notice on [[Theme Lab — Feedback]]: tick the item, then write under its Notes block."),
      props={"logseq.property/order-list-type": "number"}),
    b("Test pages",
      b("[[01 Typography]]"), b("[[02 Outliner]]"), b("[[03 Links and References]]"),
      b("[[04 Properties and Tags]]"), b("[[05 Tasks]]"), b("[[06 Callouts, Quotes, Colours]]"),
      b("[[07 Code and Math]]"), b("[[08 Tables and Queries]]"), b("[[09 Flashcards]]"),
      b("[[Theme Lab — Feedback]]")),
    b("Also check the surfaces that aren't pages: left sidebar, command palette (⌘K), slash menu (/), "
      "date picker (/date), right-click menus, settings dialog, hover previews, the right sidebar, All pages, Graph view."),
]))

pages.append(page("01 Typography", [
    b("Heading 1", props={"logseq.property/heading": 1}),
    b("Heading 2", props={"logseq.property/heading": 2}),
    b("Heading 3", props={"logseq.property/heading": 3}),
    b("Heading 4", props={"logseq.property/heading": 4}),
    b("Heading 5", props={"logseq.property/heading": 5}),
    b("Heading 6", props={"logseq.property/heading": 6}),
    b("Body text at 15/24. The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. "
      "This sentence is long on purpose so it wraps across several lines and shows line height, measure and letter-spacing "
      "at the width you normally read at."),
    b("Inline styles: **bold**, *italic*, ~~strikethrough~~, ==highlight==, `inline code`, and a {{cloze hidden answer}}."),
    b("Markdown heading typed in the text", b("# A markdown H1 inside a block"), b("### A markdown H3 inside a block")),
    b("Numbered list", b("First"), b("Second", b("Nested one"), b("Nested two")), b("Third"),
      props={"logseq.property/order-list-type": "number"}),
    b("Edit this block to see editor styles: click into it, select text, and press Esc."),
], uid=TYPO_PAGE))

pages.append(page("02 Outliner", [
    b("Level 1 — hover a bullet, then click the guide line to collapse",
      b("Level 2",
        b("Level 3",
          b("Level 4 — deep nesting shows guide-line contrast"),
          b("Level 4 sibling")),
        b("Level 3 sibling")),
      b("Level 2 sibling")),
    b("A collapsed block (bullet with a halo). Click the bullet arrow to expand.",
      b("Hidden child one"), b("Hidden child two"), **{"block__collapsed?": True}),
    b("A block with an icon instead of a bullet",
      props={"logseq.property/icon": {kw("type"): kw("tabler-icon"), kw("id"): "star"}}),
    b("Select several blocks (click one, shift-click another) to see the selection colour."),
    b("Drag a bullet to see the drop indicator."),
]))

pages.append(page("03 Links and References", [
    b("A page link: [[Target Page]]. A link to an empty page: [[Empty Page]]."),
    b("Inline tags: #[[Idea]] and #[[Book]]."),
    b("External link: [Logseq](https://logseq.com) and a bare URL https://example.com."),
    b("This block is the target of a block reference below.", **{"block__uuid": REF_TARGET, "build__keep-uuid?": True}),
    b(f"Block reference: [[{REF_TARGET}]]"),
    b("An embedded block:", b(f"{{{{embed [[{EMBED_TARGET}]]}}}}")),
    b("Embed source block with children", b("child A"), b("child B"),
      **{"block__uuid": EMBED_TARGET, "build__keep-uuid?": True}),
    b("Hover the links above to see the preview popup."),
    b("Scroll down: this page has linked references from other pages."),
]))
pages.append(page("Empty Page", []))
pages.append(page("Target Page", [
    b("Back to [[03 Links and References]]. Also referenced from [[04 Properties and Tags]]."),
], uid=TARGET_PAGE))

pages.append(page("04 Properties and Tags", [
    b("The Pragmatic Programmer", tags=["user.class/Book"], props={
        "user.property/author": "Hunt & Thomas", "user.property/rating": 5, "user.property/finished": True,
        "user.property/read-on": pref(READ_DAY)}),
    b("Designing Data-Intensive Applications", tags=["user.class/Book"], props={
        "user.property/author": "Martin Kleppmann", "user.property/rating": 4, "user.property/finished": False}),
    b("Ada Lovelace", tags=["user.class/Person"], props={"user.property/website": "https://en.wikipedia.org/wiki/Ada_Lovelace"}),
    b("A block with a multi-value node property",
      props={"user.property/related": ESet([pref(TARGET_PAGE), pref(TYPO_PAGE)])}),
    b("A block with several tags", tags=["user.class/Idea", "user.class/Book"]),
    b("Click a property value to open its editor popover; click the tag chips on the right."),
]))

pages.append(page("05 Tasks", [
    task("Backlog task", "backlog"),
    task("Todo task", "todo"),
    task("Doing task with high priority", "doing", "high"),
    task("In review task with medium priority", "in-review", "medium"),
    task("Done task", "done", "low"),
    task("Canceled task", "canceled"),
    task("Urgent todo", "todo", "urgent"),
    b(
        "Todo with a deadline", tags=["logseq.class/Task"],
        props={"logseq.property/status": kw("logseq.property/status.todo"),
               "logseq.property/deadline": 1790000000000}),
    b("Click a status icon to cycle it; open the status and priority pickers."),
]))

callouts = [b(f"#+BEGIN_{t}\nA {t.lower()} callout. Body text inside the callout.\n#+END_{t}")
            for t in ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION", "PINNED"]]
pages.append(page("06 Callouts, Quotes, Colours", [
    b("Callouts", *callouts),
    b("Quotes",
      b("> A markdown quote typed with a leading >."),
      b("A block with the Quote display type.", props={"logseq.property.node/display-type": kw("quote")})),
    b("Block background colours (right-click a bullet to change)",
      *[b(f"Background: {c}", props={"logseq.property/background-color": c}) for c in HL]),
    b("Inline ==highlight== in running text."),
]))

pages.append(page("07 Code and Math", [
    b("Inline `code` in a sentence."),
    b("const greet = (name) => `Hello, ${name}`;\nconsole.log(greet('Logseq'));",
      props={"logseq.property.node/display-type": kw("code"), "logseq.property.code/lang": "javascript"}),
    b("(defn square [x]\n  (* x x))",
      props={"logseq.property.node/display-type": kw("code"), "logseq.property.code/lang": "clojure"}),
    b("e^{i\\pi} + 1 = 0", props={"logseq.property.node/display-type": kw("math")}),
    b("Inline math: $a^2 + b^2 = c^2$."),
]))

pages.append(page("08 Tables and Queries", [
    b("Open the Book tag page ([[Book]]) for the table view of tagged nodes."),
    b("All pages (left sidebar › Pages) is another table to check: header, row hover, selection, filters."),
    b("Tip: type /Query in a new block below to try the query builder."),
]))

pages.append(page("09 Flashcards", [
    b("What colour is the tint in light mode?", b("Deep slate #223B3B"), tags=["logseq.class/Card"]),
    b("Open Flashcards in the left sidebar to review the card dialog."),
]))

feedback = page("Theme Lab — Feedback", [
    b("Tick each item once reviewed (click the status icon). Write observations under its Notes block. "
      "Add a screenshot by pasting it into the Notes block.", props={"logseq.property/heading": 3}),
    b("Overall impression: "),
    b("Pages",
      check("Page title and headings", "Size ramp H1–H6, weight, the line under H1/H2"),
      check("Body text and inline styles", "Font, 15/24 rhythm, bold/italic/strike, highlight, inline code"),
      check("Bullets, collapse and guide lines", "Bullet size and colour, hover, collapsed halo, guide contrast"),
      check("Links, tags and references", "Page link underline, tag pills, external link arrow, block ref, embed, hover preview"),
      check("Properties and tag chips", "Properties area, keys vs values, value popovers, tag chips on the right"),
      check("Tasks and priorities", "Status icon colours, priority icons, done/canceled appearance"),
      check("Callouts, quotes, background colours", "Six callout types, Decision (PINNED), quote style, 7 background colours"),
      check("Code and math", "Code block background and gutter, syntax colours, math"),
      check("Tables (tag page, All pages)", "Header, rows, hover, selection"),
      check("Journals", "Journal list, today's page, date headers")),
    b("App surfaces",
      check("Left sidebar", "Background, item height, hover, active item, group headers"),
      check("Command palette (⌘K)", "Panel, input, highlighted row, group headers, keycaps"),
      check("Slash menu and autocomplete", "Type / and [[ in a block"),
      check("Context menus and popovers", "Right-click a bullet; click a property value"),
      check("Date picker", "Type /date: selected day, today, navigation"),
      check("Dialogs and settings", "Settings window, confirmation dialogs, scrim"),
      check("Right sidebar", "Shift-click a link to open it in the sidebar"),
      check("Graph view", "Node and label colours against the background"),
      check("Flashcards review", "Card dialog and buttons"),
      check("Buttons and inputs", "Primary and secondary buttons, text inputs, focus ring")),
    b("Modes",
      check("Dark mode", "Repeat a quick pass over every page"),
      check("Other accent colour", "Pick a non-default accent; the theme should not change")),
])
pages.append(feedback)

pages.append(journal(20260929, [
    b("Today's journal: check the date header and how journals stack."),
    b("Worked on [[Theme Lab — Start Here]] #[[Idea]]"),
    task("Review the theme in dark mode", "todo"),
]))
pages.append(journal(20260915, [b("Finished reading a book: see [[04 Properties and Tags]].")], uid=READ_DAY))
pages.append(journal(20260928, [b("Yesterday's journal entry, so the journal list has more than one day.")]))

export = {
    kw("logseq.db.sqlite.export/export-type"): kw("graph-human"),
    kw("properties"): properties,
    kw("classes"): classes,
    kw("pages-and-blocks"): pages,
    kw("logseq.db.sqlite.export/graph-files"): [{kw("file/path"): "logseq/custom.css", kw("file/content"): CSS}],
}

out = HERE / "theme-lab.edn"
out.write_text(edn(export) + "\n")
print(f"wrote {out} ({out.stat().st_size} bytes, {len(pages)} pages)")
