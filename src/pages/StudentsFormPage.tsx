import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { studentSchema, type StudentFormValues } from '@/data/schemas/student'
import { useCreateStudent, useStudent, useUpdateStudent } from '@/hooks/api'
import { EDUCATIONAL_LEVELS, GENDERS, PROVINCES } from '@/constants/student'

export function StudentsFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useStudent(id ?? '')
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      gender: 'F',
      province: '',
      canton: '',
      educationalLevel: 'Primary',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        gender: existing.gender,
        province: existing.province,
        canton: existing.canton,
        educationalLevel: existing.educationalLevel as StudentFormValues['educationalLevel'],
      })
    }
  }, [existing, reset])

  async function onSubmit(values: StudentFormValues) {
    if (isEdit && id) {
      await updateStudent.mutateAsync({ id, patch: values })
      navigate(`/app/students/${id}`)
    } else {
      const created = await createStudent.mutateAsync(values)
      navigate(`/app/students/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? 'Edit student' : 'New student'}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select
              value={watch('gender')}
              onValueChange={(v) =>
                setValue('gender', v as StudentFormValues['gender'], { shouldValidate: true })
              }
            >
              <SelectTrigger aria-label="Gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Province</Label>
            <Select
              value={watch('province')}
              onValueChange={(v) => setValue('province', v, { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province && (
              <p className="text-xs text-destructive">{errors.province.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canton">Canton</Label>
            <Input id="canton" {...register('canton')} />
            {errors.canton && <p className="text-xs text-destructive">{errors.canton.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Educational level</Label>
          <Select
            value={watch('educationalLevel')}
            onValueChange={(v) =>
              setValue('educationalLevel', v as StudentFormValues['educationalLevel'], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger aria-label="Educational level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDUCATIONAL_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/students')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
