import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mostRecentByDate<T extends { date: string }>(items: T[], count: number): T[] {
  return [...items].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)).slice(0, count)
}
