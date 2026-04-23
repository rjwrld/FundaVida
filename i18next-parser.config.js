/** @type {import('i18next-parser').UserConfig} */
export default {
  // The CI gate `npm run i18n:check` runs this parser then enforces `git diff --exit-code src/locales/`.
  // A non-zero diff means either (a) a t() call added a key missing from the JSON, or
  // (b) a committed JSON key is orphaned relative to the parsed output. Both fail CI — reconcile
  // by editing en.json/es.json manually before re-running.
  locales: ['en', 'es'],
  output: 'src/locales/$LOCALE.json',
  input: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/test/**'],
  keySeparator: '.',
  namespaceSeparator: false,
  defaultNamespace: 'translation',
  createOldCatalogs: false,
  sort: true,
  useKeysAsDefaultValue: false,
  skipDefaultValues: false,
  indentation: 2,
  lineEnding: 'lf',
  failOnWarnings: false,
  failOnUpdate: false,
  verbose: false,
}
