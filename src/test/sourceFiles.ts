import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface SourceFile {
  file: string
  source: string
}

/**
 * Every `.ts`/`.tsx` file under `root`, recursively, as `{ relative path, contents }`.
 *
 * Shared by the tests that guard i18next-parser's blind spots (`toastKeys`,
 * `dynamicKeys`): both must scan exactly the files the extractor scans, so this mirrors
 * the parser's `input` globs in `i18next-parser.config.js` — all of `src`, minus
 * `__tests__` anywhere and `src/test`. `skip` takes paths relative to `root`, matched
 * exactly, so excluding a file named `test.ts` never costs you a directory named `test`.
 */
export function readSourceFiles(root: string, skip: string[] = []): SourceFile[] {
  const skipped = new Set(skip.map((entry) => path.resolve(root, entry)))

  function walk(dir: string): SourceFile[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (skipped.has(full)) return []
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full)
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) return []
      return [{ file: path.relative(root, full), source: readFileSync(full, 'utf8') }]
    })
  }

  return walk(root)
}
