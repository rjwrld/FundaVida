import { useContext } from 'react'
import {
  CommandPaletteContext,
  type CommandPaletteCtx,
} from '@/components/shared/commandPaletteContext'

export function useCommandPaletteContext(): CommandPaletteCtx {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error('useCommandPaletteContext must be used within CommandPaletteProvider')
  }
  return ctx
}
