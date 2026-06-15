#!/usr/bin/env node
// Validates every content/**/*.mdx file the same way the wiki editor does.
//
// Run locally:   npm run validate:content
// Runs in CI:    .github/workflows/validate-content.yml on every push / PR
//
// Exits non-zero (failing the build) if any page would break `next build`, and
// prints a clear, file-and-line report of what's wrong and how to fix it.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintMdx } from '../src/lib/mdxLint.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

async function findMdxFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findMdxFiles(full)));
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const files = await findMdxFiles(CONTENT_DIR);
let failures = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  const content = await readFile(file, 'utf8');
  const result = await lintMdx(content);
  if (result.ok) continue;

  failures++;
  console.error(`\n✗ ${rel}`);
  for (const err of result.errors) {
    // Map body-relative line numbers back to the actual line in the file.
    const fileLine = err.line ? err.line + result.frontmatterLines : undefined;
    const where = fileLine ? `  line ${fileLine}: ` : '  ';
    console.error(`${where}${err.message}`);
  }
}

if (failures > 0) {
  console.error(`\n✗ ${failures} content file(s) would break the site build. Fix the issues above before merging.\n`);
  process.exit(1);
}

console.log(`✓ All ${files.length} content pages are valid.`);
