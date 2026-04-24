import { useMemo, type ReactNode } from 'react'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { CommandPaletteContext, type CommandPaletteCtx } from './commandPaletteContext'

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const { open, setOpen } = useCommandPalette()
  const value = useMemo<CommandPaletteCtx>(() => ({ open, setOpen }), [open, setOpen])
  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
}
