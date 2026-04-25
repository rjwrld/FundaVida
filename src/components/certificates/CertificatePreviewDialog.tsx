import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { PDFViewer } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'
import { transitionDefaults } from '@/lib/motion'

// motion controls the full `transform` style, so the centering translate must
// live in the variants — Tailwind's -translate-x/y classes get overridden.
const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, x: '-50%', y: '-50%' },
  visible: { opacity: 1, scale: 1, x: '-50%', y: '-50%' },
}

interface PreviewPayload {
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAt: string
}

interface Props {
  open: boolean
  payload: PreviewPayload | null
  dataUrl: string | null
  downloadName: string
  onClose: () => void
}

export function CertificatePreviewDialog({ open, payload, dataUrl, downloadName, onClose }: Props) {
  const { t } = useTranslation()
  const handleDownload = () => {
    if (!dataUrl) return
    const anchor = document.createElement('a')
    anchor.setAttribute('download', downloadName)
    anchor.setAttribute('href', dataUrl)
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    setTimeout(() => anchor.remove(), 0)
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && payload && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                variants={dialogVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={transitionDefaults}
                className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-3xl flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-elevated"
              >
                <div className="flex items-start justify-between gap-4">
                  <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                    {t('certificates.list.dialog.title')}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close
                    className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={t('common.actions.close')}
                  >
                    <X size={18} aria-hidden="true" />
                  </DialogPrimitive.Close>
                </div>
                <div className="min-h-[280px] flex-1 overflow-hidden rounded-md border border-border">
                  <PDFViewer width="100%" height="100%">
                    <CertificateTemplate
                      studentName={payload.studentName}
                      courseName={payload.courseName}
                      programName={payload.programName}
                      score={payload.score}
                      issuedAt={payload.issuedAt}
                    />
                  </PDFViewer>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    {t('common.actions.close')}
                  </Button>
                  <Button disabled={!dataUrl} aria-disabled={!dataUrl} onClick={handleDownload}>
                    {t('certificates.list.downloadPdf')}
                  </Button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
