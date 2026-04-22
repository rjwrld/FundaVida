import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface Props {
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAt: string
}

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  border: {
    borderWidth: 4,
    borderColor: '#1e3a8a',
    borderStyle: 'solid',
    flex: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 12, color: '#1e3a8a', letterSpacing: 2 },
  title: { fontSize: 36, fontWeight: 700, color: '#0f172a', marginTop: 24 },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 8 },
  name: { fontSize: 28, fontWeight: 700, color: '#1e3a8a', marginTop: 48 },
  body: { fontSize: 14, color: '#0f172a', marginTop: 16, textAlign: 'center' },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 48,
  },
  footerLabel: { fontSize: 10, color: '#64748b' },
  footerValue: { fontSize: 12, color: '#0f172a', marginTop: 4 },
})

export function CertificateTemplate({
  studentName,
  courseName,
  programName,
  score,
  issuedAt,
}: Props) {
  const issued = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.brand}>FUNDAVIDA</Text>
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>
              Awarded in recognition of the successful completion of the course
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.name}>{studentName}</Text>
            <Text style={styles.body}>
              has successfully completed {courseName} ({programName}){'\n'}with a final score of{' '}
              {score}.
            </Text>
          </View>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>ISSUED</Text>
              <Text style={styles.footerValue}>{issued}</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>PROGRAM</Text>
              <Text style={styles.footerValue}>{programName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
