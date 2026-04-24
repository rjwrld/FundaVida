import { createContext } from 'react'

export interface CommandPaletteCtx {
  open: boolean
  setOpen: (open: boolean) => void
}

export const CommandPaletteContext = createContext<CommandPaletteCtx | null>(null)
