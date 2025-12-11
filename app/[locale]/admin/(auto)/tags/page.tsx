'use client'

import type { ExperienceDTO, TagDTO } from '@/lib/types'
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

const apiResponse = [
  {
    id: 'cmfbqaica0000mq9xcczme1ii',
    type: 'EXPERIENCE_TECH',
    isVisible: true,
    hexColor: '#8b5cf6',
    translations: [
      {
        id: 'cmfbqaica0001mq9xq8xy3jc9',
        locale: 'fr',
        name: 'techno',
        tagId: 'cmfbqaica0000mq9xcczme1ii',
      },
      {
        id: 'cmfbqaica0002mq9xe9a66b4z',
        locale: 'en',
        name: 'techno',
        tagId: 'cmfbqaica0000mq9xcczme1ii',
      },
    ],
    nameByLocale: {
      fr: 'techno',
      en: 'techno',
    },
  },
]

export default function TagsPage() {
  const [current, setCurrent] = useState<TagDTO | null>(null)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Tags</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Recherche…" className="w-48 pl-8 sm:w-64" />
          </div>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Nouvelle
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
              <TableRow>
                <TableHead className="w-[25%]">Name</TableHead>
                <TableHead className="w-[25%]">HexColor</TableHead>
                <TableHead className="w-[25%] text-center">Visible</TableHead>
                <TableHead className="w-[25%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiResponse.map((tag) => {
                const title = tag.nameByLocale.fr ?? tag.nameByLocale.en ?? 'pas de nom'
                return (
                  <TableRow key={tag.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="truncate font-medium">{title}</TableCell>
                    <TableCell className="truncate font-medium">
                      <div
                        className="w-1/2 rounded-sm border"
                        style={{ backgroundColor: tag.hexColor }}
                      >
                        Couleur
                      </div>
                    </TableCell>
                    <TableCell className="truncate text-center font-medium">
                      <Switch
                        checked={tag.isVisible}
                        // onCheckedChange={async (next) => {
                        //   setItems((prev) =>
                        //     prev.map((x) =>
                        //       x.id === it.id ? { ...x, isVisible: next } : x
                        //     )
                        //   );
                        //   try {
                        //     await ExperienceApi.patchVisibility(it.id, next);
                        //   } catch {
                        //     setItems((prev) =>
                        //       prev.map((x) =>
                        //         x.id === it.id ? { ...x, isVisible: !next } : x
                        //       )
                        //     );
                        //   }
                        // }}
                      />
                    </TableCell>
                    <TableCell className="truncate text-right font-medium">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" aria-label="Éditer">
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
                              <AlertDialogAction className="text-destructive-foreground bg-destructive hover:bg-destructive/90">
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

              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aucun résultat.
                </TableCell>
              </TableRow>

              {/* {loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Chargement…
                  </TableCell>
                </TableRow>
              )} */}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      <Dialog>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{current ? 'Éditer un tag' : 'Créer un tag'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {/* <ExperienceForm
              initial={current}
              onCancel={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                load();
              }}
            /> */}
            wip
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
