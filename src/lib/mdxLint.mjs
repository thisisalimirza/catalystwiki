// Shared MDX validator used by BOTH the save API (server-side hard gate) and the
// CI script (scripts/validate-content.mjs). Keeping a single source of truth means
// the wiki editor and CI agree on exactly what counts as "broken" content.
//
// The goal: catch the kinds of mistakes that make `next build` fail on Vercel
// (unbalanced <Callout> tags, broken { } expressions, typo'd component names,
// malformed frontmatter) BEFORE they ever reach the main branch — and explain
// them in plain English a non-technical editor can act on.

import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

// Custom components available inside MDX content.
// KEEP IN SYNC with src/components/MdxComponents.tsx — anything not listed here
// (and not a normal lowercase HTML tag) will crash the production build.
export const KNOWN_COMPONENTS = ['Callout', 'LinkCard', 'PersonRow'];
const KNOWN = new Set(KNOWN_COMPONENTS);

// Translate the MDX compiler's terse, jargon-y errors into guidance an editor
// who has never seen JSX can actually follow.
function humanize(message) {
  const m = message || '';
  if (/closing slash|expected an open tag/i.test(m)) {
    return 'There is a closing tag (like </Callout>) with no matching opening tag above it. Every </Callout> needs a <Callout ...> before it. Tip: you probably deleted or moved the opening line by accident.';
  }
  if (/expected a closing tag|before the end|unexpected end of file/i.test(m)) {
    return 'A box was opened but never closed. Every <Callout ...> needs a matching </Callout> further down. Tip: count your opening and closing tags — they must match.';
  }
  if (/could not parse expression|acorn|unexpected character|unexpected token/i.test(m)) {
    return 'There is a broken { } expression in the text. Curly braces { } have a special meaning in pages. If you meant to type a literal brace, wrap that text in `backticks` or rephrase it.';
  }
  return m;
}

// Blank out fenced ``` code blocks and `inline code` (preserving line count) so
// JSX-looking examples inside code samples don't trigger false "unknown component"
// warnings. This wiki is about building software, so code samples are common.
function blankCode(src) {
  const blankToSpaces = (chunk) => chunk.replace(/[^\n]/g, ' ');
  return src
    .replace(/```[\s\S]*?```/g, blankToSpaces)
    .replace(/`[^`\n]*`/g, blankToSpaces);
}

// Find capitalized JSX tags that aren't one of our known components. These compile
// fine but blow up at render time with "Component X is not defined", which is the
// other common way a build silently dies.
function findUnknownComponents(body, lineOffset) {
  const scanned = blankCode(body);
  const found = [];
  scanned.split('\n').forEach((line, i) => {
    const re = /<([A-Z][A-Za-z0-9]*)/g;
    let mm;
    while ((mm = re.exec(line)) !== null) {
      if (!KNOWN.has(mm[1])) {
        found.push({ name: mm[1], line: i + 1 + lineOffset });
      }
    }
  });
  return found;
}

/**
 * Validate a full .mdx file (frontmatter + body).
 * Returns { ok, errors, frontmatterLines } where each error has a plain-English
 * `message` and a body-relative `line` (add `frontmatterLines` to map to the file).
 */
export async function lintMdx(fullContent) {
  // 1) Frontmatter (the --- block at the top) must be valid YAML.
  let parsed;
  try {
    parsed = matter(fullContent);
  } catch (e) {
    return {
      ok: false,
      frontmatterLines: 0,
      errors: [{
        kind: 'frontmatter',
        line: 1,
        message: 'The page settings at the very top (the block between the --- lines) are not formatted correctly: ' + (e instanceof Error ? e.message : String(e)),
      }],
    };
  }

  const body = parsed.content;
  // How many lines the frontmatter occupies, so CI can map body lines to file lines.
  const bodyStart = fullContent.indexOf(body);
  const frontmatterLines = bodyStart > 0 ? fullContent.slice(0, bodyStart).split('\n').length - 1 : 0;

  const errors = [];

  // 2) The body must compile as MDX (this is exactly what `next build` does).
  try {
    await compile(body, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] });
  } catch (e) {
    errors.push({
      kind: 'syntax',
      message: humanize(e && e.message),
      raw: e && e.message,
      line: e && e.line != null ? e.line : undefined,
      column: e && e.column != null ? e.column : undefined,
    });
  }

  // 3) Only check component names if the syntax is otherwise valid (avoids noise).
  if (errors.length === 0) {
    for (const u of findUnknownComponents(body, 0)) {
      errors.push({
        kind: 'unknown-component',
        line: u.line,
        message: `"<${u.name}>" is not a component this wiki knows about. The only special components are: ${KNOWN_COMPONENTS.join(', ')}. Check the spelling and capitalization (for example, it must be <Callout>, not <callout> or <Calout>).`,
      });
    }
  }

  return { ok: errors.length === 0, errors, frontmatterLines };
}
