/** @type {import('i18next-parser').UserConfig} */
export default {
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
