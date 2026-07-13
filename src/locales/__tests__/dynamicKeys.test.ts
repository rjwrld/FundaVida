import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { readSourceFiles } from '@/test/sourceFiles'

/**
 * i18next-parser only sees keys written as string literals. A key reached through an
 * interpolated template — t(`courses.status.${status}`) — is invisible to it, so the
 * family must be hand-declared in `src/locales/keys.ts` to survive extraction. Miss
 * that and the parser prunes the keys from both dictionaries and the UI starts echoing
 * raw key paths at the user, with no gate firing: `i18n:check` only diffs the parser
 * against the committed locales, and the two agree about the absence (#323, #329).
 *
 * This test closes the hole mechanically: every dynamic `t()` in the app must have a
 * static prefix, and `keys.ts` must declare at least one key under that prefix.
 *
 * Scope, deliberately: this proves a family is *backed*, not that it is *complete* —
 * declaring `auditLog.actions.create` alone satisfies the prefix while ten other
 * AuditAction members render raw (#345). Per-member exhaustiveness is a typed concern
 * and lives in `src/lib/__tests__/i18n.test.ts`, keyed off the enum.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(here, '../..')
const keysFile = path.resolve(here, '../keys.ts')

/**
 * A `t()` call opening with a template literal. `\b` keeps it off the tail of longer
 * identifiers — `get(`…`)`, `sort(`…`)` — while still matching `i18n.t(`. The `\s*`
 * matters: Prettier wraps a call past `printWidth` to `t(\n  `key.${x}`\n)`, and a
 * scanner that demanded the backtick sit flush against `t(` would go quietly blind to
 * the family the next time someone renamed a variable.
 */
const DYNAMIC_CALL = /\bt\(\s*`([^`]*)`/g
/** A `t()` call in keys.ts, however its argument is written. */
const DECLARED_CALL = /\bt\(/g
/** A `t()` call in keys.ts whose argument is a plain quoted key this test can read. */
const DECLARED_KEY_LITERAL = /\bt\('([^']+)'\)/g

/**
 * keys.ts with its commentary removed. The declarations must be read from code alone:
 * the comments there quote real call sites verbatim (`// Keys referenced via
 * t('courses.list.columns.status')`), so a regex over the raw text would let a family
 * that was only ever *described* in a comment pass as declared — green guard, pruned
 * keys, raw key paths on screen. i18next-parser reads syntax and ignores comments; so
 * must this.
 */
function codeOnly(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join('\n')
}

/** Every dynamic `t()` call site, with the static prefix the parser needs declared. */
function collectDynamicCalls(): { file: string; template: string; prefix: string }[] {
  // keys.ts is the *provider*, not a consumer: its comments quote the very call sites
  // below, and scanning it would have the file vouch for itself.
  return readSourceFiles(srcDir, ['test', 'locales/keys.ts']).flatMap(({ file, source }) =>
    [...source.matchAll(DYNAMIC_CALL)]
      .map((match) => match[1] as string)
      .filter((template) => template.includes('${'))
      .map((template) => ({ file, template, prefix: template.slice(0, template.indexOf('${')) }))
  )
}

const dynamicCalls = collectDynamicCalls()
const keysSource = codeOnly(readFileSync(keysFile, 'utf8'))
const declaredKeys = [...keysSource.matchAll(DECLARED_KEY_LITERAL)].map(
  (match) => match[1] as string
)

describe('dynamic translation keys', () => {
  it('finds the dynamic call sites and the keys.ts declarations', () => {
    expect(dynamicCalls.length).toBeGreaterThan(0)
    expect(declaredKeys.length).toBeGreaterThan(0)
  })

  // Guards the guard: a declaration built from a template literal, a loop or a shared
  // constant is invisible to the scan above and would silently shrink the backing set,
  // so the prefix check below could pass a family that keys.ts no longer really covers.
  // Fail loudly instead — keys.ts is a parser fixture, and every line must stay literal.
  it('writes every keys.ts declaration as a static literal', () => {
    const declared = keysSource.match(DECLARED_CALL)?.length ?? 0
    expect(declaredKeys.length).toBe(declared)
  })

  // A key interpolated from its first character — t(`${key}`) — has no static prefix to
  // check, so it would pass the backing test below by having nothing to test. Fail on it
  // instead: give it a literal prefix, or resolve it through a keys.ts-backed constant.
  it('gives every dynamic key a static prefix', () => {
    const rootless = dynamicCalls
      .filter(({ prefix }) => prefix === '')
      .map(({ file, template }) => `t(\`${template}\`) (${file})`)
    expect(rootless).toEqual([])
  })

  it('backs every dynamic key prefix with a declaration in keys.ts', () => {
    const unbacked = dynamicCalls
      .filter(({ prefix }) => !declaredKeys.some((key) => key.startsWith(prefix)))
      .map(({ file, template, prefix }) => `${prefix}* — t(\`${template}\`) (${file})`)
    expect(unbacked).toEqual([])
  })
})
