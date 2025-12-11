// src/components/forms/TagMultiSelect.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CreateTagPayload } from '@/lib/tag/tag.api'
import type { TagDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check, Plus, Search, X } from 'lucide-react'
import * as React from 'react'
import { TagQuickCreateDialog } from '../tags/quick-create-dialog'

/** Libellé selon la locale, avec fallbacks */
function getName(tag: TagDTO, locale: string) {
  const anyTag = tag as any
  return (
    anyTag?.nameByLocale?.[locale] ??
    anyTag?.translations?.find((t: any) => t.locale === locale)?.name ??
    anyTag?.translations?.[0]?.name ??
    tag?.id ??
    ''
  )
}

type CreateDefaults = {
  type: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH'
  hexColor?: string
  isVisible?: boolean
}

export function TagMultiSelect({
  value = [],
  onChange,
  options = [],
  locale = 'fr',
  placeholder = 'Rechercher un tag…',
  allowCreate = false,
  locales = ['fr', 'en'],
  createDefaults,
  createTag,
  onCreated,
  compact = true,
}: {
  value?: string[]
  onChange: (ids: string[]) => void
  options?: TagDTO[]
  locale?: string
  placeholder?: string

  allowCreate?: boolean
  locales?: string[]
  createDefaults?: CreateDefaults
  createTag?: (payload: CreateTagPayload) => Promise<TagDTO>
  onCreated?: (tag: TagDTO) => void

  compact?: boolean
}) {
  const safeOptions = Array.isArray(options) ? options : []
  const safeValue = Array.isArray(value) ? value : []

  const [query, setQuery] = React.useState('')
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null) // ancre du popover

  const selected = safeOptions.filter((o) => safeValue.includes(o.id))

  const visibleOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return safeOptions
    return safeOptions.filter((opt) => getName(opt, locale).toLowerCase().includes(q))
  }, [safeOptions, query, locale])

  const handleToggle = (id: string) => {
    const isSel = safeValue.includes(id)
    onChange(isSel ? safeValue.filter((v) => v !== id) : [...safeValue, id])
  }

  // Ouvrir la recherche en cliquant sur toute la barre
  const openSearch = () => {
    setSearchOpen(true)
    // focus l’ancre pour une bonne position du popover
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  // Accessibilité clavier : Enter/Space ouvre la recherche, Backspace supprime le dernier tag
  const onContainerKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSearch()
    } else if (e.key === 'Backspace' && selected.length > 0) {
      e.preventDefault()
      onChange(safeValue.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      {/* Barre cliquable + scroll horizontal, ne bouge pas le dialog */}
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        onClick={openSearch}
        onKeyDown={onContainerKeyDown}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-2 py-1 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
          'cursor-text',
          compact ? 'min-h-10 flex-nowrap overflow-x-auto' : 'flex-wrap',
        )}
      >
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground select-none">{placeholder}</span>
        )}

        {/* Chips sélectionnés — tout le chip est cliquable pour retirer */}
        {selected.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation() // n’ouvre pas la recherche
              handleToggle(tag.id)
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="group inline-flex items-center rounded-full bg-muted/60 px-2 py-1 text-xs transition-colors hover:bg-muted"
            style={tag.hexColor ? { background: tag.hexColor } : undefined}
            aria-label={`Retirer ${getName(tag, locale)}`}
            title={`Retirer ${getName(tag, locale)}`}
          >
            <span className="text-foreground/90">{getName(tag, locale)}</span>
            <span
              className="ml-1 inline-flex items-center justify-center rounded p-0.5 hover:bg-background/30"
              onClick={(e) => {
                e.stopPropagation()
                handleToggle(tag.id)
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}

        {/* Espace flexible */}
        <div className="flex-1" />

        {/* Bouton loupe = ancre du popover (mais cliquer la barre ouvre aussi) */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 cursor-pointer"
              aria-label="Rechercher un tag"
              onClick={(e) => {
                e.stopPropagation() // évite toggle double
                setSearchOpen((v) => !v)
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" onClick={(e) => e.stopPropagation()}>
            <Command>
              <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
              <CommandEmpty className="p-3 text-sm">Aucun résultat.</CommandEmpty>
              <CommandGroup>
                {visibleOptions.map((opt) => {
                  const isSel = safeValue.includes(opt.id)
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.id}
                      className="cursor-pointer"
                      onSelect={() => handleToggle(opt.id)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', isSel ? 'opacity-100' : 'opacity-0')} />
                      <span>{getName(opt, locale)}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Bouton + = ouvre le Dialog de création (totalement indépendant de la liste) */}
        {allowCreate && !!createTag && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 cursor-pointer"
            aria-label="Créer un tag"
            onClick={(e) => {
              e.stopPropagation()
              setCreateOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dialog de création avancée (overlay, non lié à la barre) */}
      {allowCreate && !!createTag && (
        <TagQuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          locales={Array.from(new Set([...(locales ?? []), 'fr', 'en']))}
          initialName={query.trim()}
          defaultType={createDefaults?.type ?? 'TECH'}
          defaultVisible={createDefaults?.isVisible ?? true}
          defaultHex={createDefaults?.hexColor ?? '#666666'}
          createTag={createTag}
          onCreated={(tag) => {
            onCreated?.(tag)
            onChange([...safeValue, tag.id]) // auto-sélection
          }}
        />
      )}
    </div>
  )
}
