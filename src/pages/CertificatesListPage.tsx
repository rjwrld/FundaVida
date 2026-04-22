import { useEffect, useState } from 'react'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStore } from '@/data/store'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { buildEligibleList, type EligibleCertificate } from '@/lib/certificates'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'

export function CertificatesListPage() {
  const currentUser = useCurrentUser()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const grades = useStore((s) => s.grades)

  const all = buildEligibleList(students, courses, grades)
  const list: EligibleCertificate[] =
    currentUser?.role === 'student' ? all.filter((c) => c.studentId === currentUser.id) : all

  const [selected, setSelected] = useState<EligibleCertificate | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  const selectedStudent = selected ? students.find((s) => s.id === selected.studentId) : null
  const selectedCourse = selected ? courses.find((c) => c.id === selected.courseId) : null

  // Pre-generate the PDF as a blob URL when a row is selected. The blob is
  // typed as application/octet-stream so headless Chromium treats it as a
  // pure download and respects the anchor's `download` attribute (PDFs would
  // otherwise be routed through the built-in viewer which ignores it).
  const selectedStudentId = selected?.studentId ?? null
  const selectedCourseId = selected?.courseId ?? null
  const selectedScore = selected?.score ?? null
  const selectedIssuedAt = selected?.issuedAt ?? null
  useEffect(() => {
    if (
      !selectedStudentId ||
      !selectedCourseId ||
      selectedScore === null ||
      selectedIssuedAt === null
    ) {
      setDataUrl(null)
      return
    }
    const student = students.find((s) => s.id === selectedStudentId)
    const course = courses.find((c) => c.id === selectedCourseId)
    if (!student || !course) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    pdf(
      <CertificateTemplate
        studentName={`${student.firstName} ${student.lastName}`}
        courseName={course.name}
        programName={course.programName}
        score={selectedScore}
        issuedAt={selectedIssuedAt}
      />
    )
      .toBlob()
      .then((blob) => {
        if (cancelled) return
        const opaque = new Blob([blob], { type: 'application/octet-stream' })
        createdUrl = URL.createObjectURL(opaque)
        setDataUrl(createdUrl)
      })
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedCourseId, selectedScore, selectedIssuedAt])

  const downloadName =
    selectedStudent && selectedCourse
      ? `certificate-${selectedStudent.id}-${selectedCourse.id}.pdf`
      : 'certificate.pdf'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Students who passed a course (score ≥ 70) earn a certificate. Preview and download the
          PDF.
        </p>
      </header>
      {list.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No eligible certificates yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const s = students.find((x) => x.id === c.studentId)
              const cs = courses.find((x) => x.id === c.courseId)
              return (
                <TableRow key={`${c.studentId}-${c.courseId}`}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{cs?.name}</TableCell>
                  <TableCell>{c.score}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setSelected(c)}>
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate preview</DialogTitle>
          </DialogHeader>
          {selected && selectedStudent && selectedCourse && (
            <div className="space-y-4">
              <div className="h-[500px] overflow-hidden rounded-md border">
                <PDFViewer width="100%" height="100%">
                  <CertificateTemplate
                    studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                    courseName={selectedCourse.name}
                    programName={selectedCourse.programName}
                    score={selected.score}
                    issuedAt={selected.issuedAt}
                  />
                </PDFViewer>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  disabled={!dataUrl}
                  aria-disabled={!dataUrl}
                  onClick={() => {
                    if (!dataUrl) return
                    const anchor = document.createElement('a')
                    anchor.setAttribute('download', downloadName)
                    anchor.setAttribute('href', dataUrl)
                    anchor.style.display = 'none'
                    document.body.appendChild(anchor)
                    anchor.dispatchEvent(
                      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
                    )
                    setTimeout(() => anchor.remove(), 0)
                  }}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
