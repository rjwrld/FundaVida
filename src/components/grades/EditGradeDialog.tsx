import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateGradeScore } from '@/hooks/api'

interface Props {
  gradeId: string | null
  initialScore: number
  studentName: string
  courseName: string
  onClose: () => void
}

export function EditGradeDialog({
  gradeId,
  initialScore,
  studentName,
  courseName,
  onClose,
}: Props) {
  const [value, setValue] = useState(String(initialScore))
  const [error, setError] = useState<string | null>(null)
  const updateGrade = useUpdateGradeScore()

  useEffect(() => {
    setValue(String(initialScore))
    setError(null)
  }, [gradeId, initialScore])

  async function onSave() {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setError('Score must be a number between 0 and 100.')
      return
    }
    if (!gradeId) return
    await updateGrade.mutateAsync({ id: gradeId, score: n })
    onClose()
  }

  return (
    <Dialog open={gradeId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit grade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {studentName} — {courseName}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={updateGrade.isPending}>
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
