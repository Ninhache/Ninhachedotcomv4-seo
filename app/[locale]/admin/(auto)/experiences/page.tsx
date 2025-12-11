// src/app/admin/experiences/page.tsx
'use client'

import type { ExperienceDTO } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ExperienceForm } from '@/components/experiences/form'
import { ExperienceApi } from '@/lib/experience/experience.api'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ExperiencesPage() {
  const [items, setItems] = useState<ExperienceDTO[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ExperienceDTO | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const items = await ExperienceApi.findAll()
      setItems(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const src = items ?? []
    if (!q) return src
    const needle = q.toLowerCase()
    return src.filter(
      (x) =>
        (x.companyName ?? '').toLowerCase().includes(needle) ||
        (x.translations ?? []).some((t) => (t.jobTitle ?? '').toLowerCase().includes(needle)),
    )
  }, [items, q])

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Experiences</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-48 pl-8 sm:w-64"
            />
          </div>
          <Button
            onClick={() => {
              setCurrent(null)
              setOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nouvelle
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
              <TableRow>
                <TableHead className="w-[22%]">Entreprise</TableHead>
                <TableHead className="w-[26%]">Titre (FR)</TableHead>
                <TableHead className="w-[24%]">Période</TableHead>
                <TableHead className="w-[14%]">Contrat</TableHead>
                <TableHead className="w-[8%]">Visible</TableHead>
                <TableHead className="w-[6%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => {
                const frTitle = it.translations.find((t) => t.locale === 'fr')?.jobTitle ?? ''
                return (
                  <TableRow
                    onDoubleClick={() => {
                      setCurrent(it)
                      setOpen(true)
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                    key={it.id}
                  >
                    <TableCell className="truncate font-medium">{it.companyName}</TableCell>
                    <TableCell className="truncate">{frTitle}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(it.startDate), 'MMM yyyy', {
                        locale: fr,
                      })}{' '}
                      — {format(new Date(it.endDate), 'MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{it.contractType}</TableCell>
                    <TableCell>
                      <Switch
                        checked={it.isVisible}
                        onCheckedChange={async (next) => {
                          setItems((prev) =>
                            prev.map((x) => (x.id === it.id ? { ...x, isVisible: next } : x)),
                          )
                          try {
                            await ExperienceApi.patchVisibility(it.id, next)
                          } catch {
                            setItems((prev) =>
                              prev.map((x) => (x.id === it.id ? { ...x, isVisible: !next } : x)),
                            )
                          }
                        }}
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrent(it)
                            setOpen(true)
                          }}
                          aria-label="Éditer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Supprimer">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette expérience ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                                onClick={async () => {
                                  await ExperienceApi.remove(it.id)
                                  load()
                                }}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      {/* <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {current ? "Éditer une expérience" : "Créer une expérience"}
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <ExperienceForm
              initial={current}
              onCancel={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                load();
              }}
            />
          </div>
        </SheetContent>
      </Sheet> */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{current ? 'Éditer une expérience' : 'Créer une expérience'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ExperienceForm
              initial={current}
              onCancel={() => setOpen(false)}
              onSaved={() => {
                setOpen(false)
                load()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
