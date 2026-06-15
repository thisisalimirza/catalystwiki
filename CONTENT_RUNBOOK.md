# Content Runbook — keeping the wiki from breaking

This wiki publishes by committing `.mdx` files to `main`, which Vercel then
builds and deploys. A single malformed page can fail the whole build, so we have
**three layers** of protection. This doc explains them and what to do if a deploy
ever fails anyway.

## How a page can break the build

The build turns each page into HTML. It fails if a page has:

- **Unbalanced boxes** — a `<Callout>` (or `<LinkCard>`, `<PersonRow>`) that's
  opened but never closed, or a `</Callout>` with no opening tag. *(This is the
  most common one.)*
- **A typo'd component** — e.g. `<Calout>` or `<callout>`. Only `Callout`,
  `LinkCard`, and `PersonRow` exist.
- **A broken `{ }` expression** in the text.
- **Malformed page settings** — the `---` block at the top isn't valid.

## The three layers that prevent it

1. **As you type (wiki editor).** The editor shows a yellow "Heads up" warning
   the moment your `<Callout>` tags don't match. Fix it before saving.
2. **On save (server).** When you click Save, the server compiles the page
   exactly like the real build. If it would break, the save is **rejected** with
   a plain-English reason — nothing broken ever reaches the site. *You cannot
   save a page that would break the build through the editor.*
3. **On every push (CI).** A GitHub Action (`.github/workflows/validate-content.yml`)
   re-checks every page and runs a full production build. This catches anything
   pushed directly to git, outside the editor.

## If a deploy fails anyway

> First: a failed build does **not** take down the live site. The previous
> version stays up until a good build replaces it. So there's no emergency —
> just a fix to make.

### Step 1 — Find the broken file (10 seconds)

Run this locally from the repo root:

```bash
npm run validate:content
```

It prints the exact file and line, e.g.:

```
✗ content/build-with-ai/medgemma-guide.mdx
  line 23: There is a closing tag (like </Callout>) with no matching opening tag above it...
```

(You can also read the same message in the failed GitHub Action or the Vercel
build log — look for `error compiling MDX`.)

### Step 2 — Fix it

Open that file at that line and fix the issue described. Almost always it's a
`<Callout>` / `</Callout>` pair that doesn't match. **Every opening tag needs one
closing tag.**

### Step 3 — Confirm and ship

```bash
npm run validate:content   # should say "All N content pages are valid."
```

Commit and push. Vercel redeploys automatically.

## For maintainers

- The validation logic lives in `src/lib/mdxLint.mjs` and is shared by the save
  API (`src/app/api/save/route.ts`) and the CI script
  (`scripts/validate-content.mjs`), so they can never disagree.
- If you add a new MDX component, add its name to `KNOWN_COMPONENTS` in
  `src/lib/mdxLint.mjs` **and** `PAIRED_COMPONENTS` in `src/components/Editor.tsx`,
  or editors will get false "unknown component" errors.
