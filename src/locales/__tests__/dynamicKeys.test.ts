import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

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
 * A `t()` call opening with a template literal. The leading `\b` keeps it off the tail
 * of longer identifiers — `get(`…`)`, `sort(`…`)` — while still matching `i18n.t(`.
 */
const DYNAMIC_CALL = /\bt\(`([^`]*)`/g
/** A key declared in keys.ts: `t('some.key')`. */
const DECLARED_KEY = /\bt\('([^']+)'\)/g

/**
 * App sources, recursively — mirrors i18next-parser's `input` globs, minus `keys.ts`
 * itself. keys.ts is the *provider*; its comments quote the very call sites below, and
 * scanning it would have the file vouch for itself.
 */
function appSources(dir: string): { file: string; source: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'test' ? [] : appSources(full)
    }
    if (full === keysFile) return []
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) return []
    return [{ file: path.relative(srcDir, full), source: readFileSync(full, 'utf8') }]
  })
}

/** Every dynamic `t()` call site, with the static prefix the parser would need declared. */
function collectDynamicCalls(): { file: string; template: string; prefix: string }[] {
  return appSources(srcDir).flatMap(({ file, source }) =>
    [...source.matchAll(DYNAMIC_CALL)]
      .map((match) => match[1] as string)
      .filter((template) => template.includes('${'))
      .map((template) => ({ file, template, prefix: template.slice(0, template.indexOf('${')) }))
  )
}

const dynamicCalls = collectDynamicCalls()
const declaredKeys = [...readFileSync(keysFile, 'utf8').matchAll(DECLARED_KEY)].map(
  (match) => match[1] as string
)

describe('dynamic translation keys', () => {
  it('finds the dynamic call sites and the keys.ts declarations', () => {
    expect(dynamicCalls.length).toBeGreaterThan(0)
    expect(declaredKeys.length).toBeGreaterThan(0)
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
