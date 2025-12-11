import { zodResolver } from '@hookform/resolvers/zod'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import type { CreateTagPayload } from '@/lib/tag/tag.api'
import type { TagDTO } from '@/lib/types'

const TagTypeEnum = z.enum(['TECH', 'QUAL', 'SKILL_CATEGORY', 'EXPERIENCE_TECH'])

const TransShape = z.object({ name: z.string().min(1, 'Requis') })

const Schema = z.object({
  type: TagTypeEnum,
  hexColor: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Hex invalide, ex: #8b5cf6'),
  isVisible: z.boolean(),
  translations: z.record(z.string(), TransShape),
})

type FormInput = z.input<typeof Schema>
type FormOutput = z.output<typeof Schema>

export function TagQuickCreateDialog({
  open,
  onOpenChange,
  locales = ['fr', 'en'],
  initialName = '',
  defaultType = 'TECH',
  defaultVisible = true,
  defaultHex = '#666666',
  createTag, // (payload) => Promise<TagDTO>
  onCreated, // (tag) => void
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  locales?: string[]
  initialName?: string
  defaultType?: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH'
  defaultVisible?: boolean
  defaultHex?: string
  createTag: (payload: CreateTagPayload) => Promise<TagDTO>
  onCreated: (tag: TagDTO) => void
}) {
  const defaultValues = React.useMemo<FormInput>(() => {
    const translations = Object.fromEntries(
      (locales?.length ? locales : ['fr', 'en']).map((loc) => [loc, { name: initialName || '' }]),
    )
    return {
      type: defaultType,
      isVisible: defaultVisible,
      hexColor: defaultHex,
      translations,
    }
  }, [locales, initialName, defaultType, defaultVisible, defaultHex])

  const form = useForm<FormInput>({
    resolver: zodResolver(Schema),
    defaultValues,
    mode: 'onChange',
  })

  React.useEffect(() => {
    // reset si initialName/locales changent après ouverture
    if (open) form.reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, open])

  const submitting = form.formState.isSubmitting

  const onSubmit = form.handleSubmit(async (raw, e) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const values = Schema.parse(raw) as FormOutput
    const payload: CreateTagPayload = {
      type: values.type,
      isVisible: values.isVisible,
      hexColor: values.hexColor,
      translations: Object.entries(values.translations).map(([locale, t]) => ({
        locale,
        name: t.name,
      })),
    }

    const created = await createTag(payload)
    onCreated(created)
    onOpenChange(false)
  })

  const localeKeys = Object.keys(form.watch('translations') || {})
  const primaryLocale = localeKeys[0] || 'fr'
  const previewName = form.watch(`translations.${primaryLocale}.name`) || 'Aperçu'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un tag</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Type + Visible */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                defaultValue={form.getValues('type')}
                onValueChange={(v) =>
                  form.setValue('type', v as any, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECH">TECH</SelectItem>
                  <SelectItem value="QUAL">QUAL</SelectItem>
                  <SelectItem value="SKILL_CATEGORY">SKILL_CATEGORY</SelectItem>
                  <SelectItem value="EXPERIENCE_TECH">EXPERIENCE_TECH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Visible</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!form.watch('isVisible')}
                  onCheckedChange={(v) =>
                    form.setValue('isVisible', v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {form.watch('isVisible') ? 'Oui' : 'Non'}
                </span>
              </div>
            </div>
          </div>

          {/* Couleur */}
          <div className="grid grid-cols-[auto,1fr] items-center gap-3">
            <div className="grid gap-1">
              <Label>Couleur</Label>
              <Input
                type="color"
                value={form.watch('hexColor')}
                onChange={(e) =>
                  form.setValue('hexColor', e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="h-9 w-12 cursor-pointer p-1"
              />
            </div>
            <div className="grid gap-1">
              <Label className="invisible">Hex</Label>
              <Input
                value={form.watch('hexColor')}
                onChange={(e) =>
                  form.setValue('hexColor', e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder="#8b5cf6"
              />
              <p className="text-xs text-destructive">{form.formState.errors.hexColor?.message}</p>
            </div>
          </div>

          {/* Traductions */}
          <div className="space-y-2">
            <Label>Traductions</Label>
            <div className="grid gap-3">
              {localeKeys.map((loc) => (
                <div key={loc} className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">{loc.toUpperCase()}</Label>
                  <Input
                    placeholder={`Nom (${loc})`}
                    value={form.watch(`translations.${loc}.name`) || ''}
                    onChange={(e) =>
                      form.setValue(`translations.${loc}.name`, e.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex rounded px-2 py-1 text-xs text-white"
              style={{ background: form.watch('hexColor') }}
            >
              {previewName}
            </span>
            <span className="text-xs text-muted-foreground">Aperçu</span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
