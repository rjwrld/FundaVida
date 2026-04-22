import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { teacherSchema, type TeacherFormValues } from '@/data/schemas/teacher'
import { useCreateTeacher, useTeacher, useUpdateTeacher } from '@/hooks/api'

export function TeachersFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useTeacher(id ?? '')
  const createTeacher = useCreateTeacher()
  const updateTeacher = useUpdateTeacher()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
      })
    }
  }, [existing, reset])

  async function onSubmit(values: TeacherFormValues) {
    if (isEdit && id) {
      await updateTeacher.mutateAsync({ id, patch: values })
      navigate(`/app/teachers/${id}`)
    } else {
      const created = await createTeacher.mutateAsync(values)
      navigate(`/app/teachers/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? 'Edit teacher' : 'New teacher'}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create teacher'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/teachers')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
