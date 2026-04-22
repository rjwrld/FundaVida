import { faker } from '@faker-js/faker'
import type { EmailCampaign, Student } from '@/types'

export function seedEmailCampaigns(students: Student[]): EmailCampaign[] {
  faker.seed(50)
  return [
    {
      id: 'cam-1',
      subject: 'Welcome to the new term',
      body: 'Hello students — our new term begins next week. Please review the schedule and confirm your attendance.',
      filter: { kind: 'all' },
      recipientIds: students.map((s) => s.id),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
    {
      id: 'cam-2',
      subject: 'Culinary program: field trip',
      body: 'Culinary students — we have arranged a visit to a local bakery. Meet at HQ at 8am next Friday.',
      filter: { kind: 'program', value: 'Culinary' },
      recipientIds: students.slice(0, 4).map((s) => s.id),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
    {
      id: 'cam-3',
      subject: 'San José province: holiday schedule',
      body: 'Students in San José — please review the updated holiday schedule attached to the bulletin.',
      filter: { kind: 'province', value: 'San José' },
      recipientIds: students
        .filter((s) => s.province === 'San José')
        .map((s) => s.id)
        .slice(0, 6),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
  ]
}
