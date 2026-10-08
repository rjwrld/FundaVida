import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import i18next from 'i18next'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/data/persistence'
import { FundaVidaMark } from './FundaVidaMark'
import { CERTIFICATE_COLORS as C } from './certificateTheme'

export interface CertificatePayload {
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAt: string
  /** The certificate's language — the UI locale it was opened in. */
  locale: Locale
}

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: C.paper, fontFamily: 'Helvetica' },
  border: {
    borderWidth: 4,
    borderColor: C.navy,
    borderStyle: 'solid',
    flex: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mark: { marginBottom: 12 },
  brand: { fontSize: 12, color: C.navy, letterSpacing: 2 },
  title: { fontSize: 36, fontWeight: 700, color: C.ink, marginTop: 24 },
  subtitle: { fontSize: 12, color: C.slate, marginTop: 8 },
  name: { fontSize: 28, fontWeight: 700, color: C.navy, marginTop: 48 },
  body: { fontSize: 14, color: C.ink, marginTop: 16, textAlign: 'center' },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 48,
  },
  footerLabel: { fontSize: 10, color: C.muted },
  footerValue: { fontSize: 12, color: C.ink, marginTop: 4 },
})

export function CertificateTemplate({
  studentName,
  courseName,
  programName,
  score,
  issuedAt,
  locale,
}: CertificatePayload) {
  // The PDF renders outside the React tree, so it takes a fixed-language t()
  // for the locale the certificate was opened in (it matches the preview).
  const t = i18next.getFixedT(locale)
  const issued = formatDate(issuedAt, locale)
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.mark}>
              <FundaVidaMark size={64} />
            </View>
            <Text style={styles.brand}>FUNDAVIDA</Text>
            <Text style={styles.title}>{t('certificates.document.title')}</Text>
            <Text style={styles.subtitle}>{t('certificates.document.subtitle')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.name}>{studentName}</Text>
            <Text style={styles.body}>
              {t('certificates.document.body', {
                course: courseName,
                program: programName,
                score: String(score),
              })}
            </Text>
          </View>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>{t('certificates.document.issued')}</Text>
              <Text style={styles.footerValue}>{issued}</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>{t('certificates.document.program')}</Text>
              <Text style={styles.footerValue}>{programName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
