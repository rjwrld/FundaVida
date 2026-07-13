import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { readSourceFiles } from '@/test/sourceFiles'

/**
 * `makeEntityMutation` resolves its `toastKey` dynamically (`t(config.toastKey)`),
 * so i18next-parser never sees it at the call site and each key must be hand-listed
 * in `src/locales/keys.ts` to reach the dictionaries. Forget that line and the toast
 * silently renders the raw key at runtime — no gate catches it (#323).
 *
 * This test closes that hole: every `toastKey` literal in the hook files must resolve
 * to a string in both locales.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const hooksDir = path.resolve(here, '..')
const localesDir = path.resolve(here, '../../../locales')

/** Any `toastKey:` property, however its value is written. */
const DECLARATION = /toastKey:/g
/** A `toastKey:` whose value is a plain quoted literal this test can resolve. */
const STATIC_DECLARATION = /toastKey:\s*(['"])([^'"]+)\1/g

/** The factory declares `toastKey: string` on its config type; it is not a call site. */
const FACTORY = 'makeEntityMutation.ts'

const sources = readSourceFiles(hooksDir, [FACTORY])

function collectToastKeys(): { file: string; key: string }[] {
  return sources.flatMap(({ file, source }) =>
    [...source.matchAll(STATIC_DECLARATION)].map((match) => ({ file, key: match[2] as string }))
  )
}

function loadLocale(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(localesDir, `${locale}.json`), 'utf8'))
}

function resolveKey(dictionary: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined,
      dictionary
    )
}

const toastKeys = collectToastKeys()

describe('makeEntityMutation toast keys', () => {
  // Guards the guard: a `toastKey` built from a template literal or a shared constant
  // is invisible to the scan below, so it would slip through exactly as #323 did. Fail
  // loudly instead — write the key as a quoted literal, or teach this test to see it.
  it('resolves every toastKey declaration to a static literal', () => {
    const unreadable = sources
      .filter(({ source }) => {
        const declared = source.match(DECLARATION)?.length ?? 0
        const readable = source.match(STATIC_DECLARATION)?.length ?? 0
        return declared !== readable
      })
      .map(({ file }) => file)
    expect(unreadable).toEqual([])
    expect(toastKeys.length).toBeGreaterThan(0)
  })

  it.each(['en', 'es'])('resolves every toastKey in %s.json', (locale) => {
    const dictionary = loadLocale(locale)
    const missing = toastKeys
      .filter(({ key }) => typeof resolveKey(dictionary, key) !== 'string')
      .map(({ file, key }) => `${key} (${file})`)
    expect(missing).toEqual([])
  })
})
