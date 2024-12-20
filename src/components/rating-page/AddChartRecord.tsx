import { SongJacket } from '@/components/entities/SongJacket'
import { BufferedInput } from '@/components/ui/buffered-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AddChartRecordForm,
  addChartRecordFormSchema,
  isSameChart,
  useChartRecords,
} from '@/contexts/ChartRecordsContext'
import { songs } from '@/data/songs'
import { safeParseImport } from '@/lib/import'
import { clamp, coerceToNumber } from '@/lib/number'
import { zodResolver } from '@hookform/resolvers/zod'
import { CaretSortIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import { Check, PlusIcon } from 'lucide-react'
import { FC, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const useFuse = () => {
  return useMemo(() => {
    return new Fuse(songs, {
      keys: [
        {
          name: 'title_localized.default',
          weight: 1.5,
        },
        {
          name: 'artist',
          weight: 1,
        },
      ],
      shouldSort: true,
      threshold: 0.6,
    })
  }, [])
}

const SearchSongAutocomplete: FC<{
  value: string
  onValueChange: (value: string) => void
}> = ({ value, onValueChange }) => {
  const listRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const fuse = useFuse()

  const searchResults = useMemo(() => {
    if (!query) {
      return songs
    }
    return fuse.search(query).map((result) => result.item)
  }, [query, fuse])

  useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }
    list.scrollTo({ top: 0 })
  }, [searchResults])

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (open) {
          startTransition(() => {
            setOpen(true)
          })
        } else {
          setOpen(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full shrink justify-between px-3"
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {value
              ? songs.find((song) => song.id === value)?.title_localized.default
              : t('addRecord.song.placeholder')}
          </span>
          <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] max-w-[100vw] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('addRecord.song.searchPlaceholder')}
            onValueChange={(value) => {
              setQuery(value)
            }}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>{t('addRecord.song.empty')}</CommandEmpty>
            <CommandGroup>
              {searchResults.map((song) => (
                <CommandItem
                  key={song.id}
                  value={song.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue)
                    setOpen(false)
                  }}
                  className={clsx(
                    'flex items-center overflow-hidden text-ellipsis whitespace-nowrap',
                    value === song.id &&
                      'bg-foreground text-background data-[selected=true]:bg-foreground/80 data-[selected=true]:text-background/80'
                  )}
                >
                  {value === song.id && <Check className="size-4" />}

                  <SongJacket
                    song={song}
                    className="size-4 rounded-[1px]"
                    pictureClassName="shrink-0"
                  />

                  <span className="shrink overflow-hidden text-ellipsis whitespace-nowrap">
                    {song.title_localized.default}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const AddChartRecord: FC = () => {
  const { t } = useTranslation()
  const [records, modifyRecords] = useChartRecords()

  const form = useForm<AddChartRecordForm>({
    resolver: zodResolver(addChartRecordFormSchema),
    defaultValues: {
      songSlug: '',
      difficultyLevel: '',
      achievementRate: 0,
    },
  })

  const songSlug = form.watch('songSlug')
  const song = useMemo(() => {
    return songs.find((song) => song.id === songSlug)
  }, [songSlug])

  const onSubmit = (data: AddChartRecordForm) => {
    const existingRecord = records.find((r) => isSameChart(r, data))
    if (existingRecord && existingRecord.achievementRate < data.achievementRate) {
      // there exists an existing record that has a lower achievement rate than the new one. Update it.
      modifyRecords.updateFirst((r) => isSameChart(r, data), data)
    } else {
      // no existing record, or the existing record has a higher achievement rate than the new one. Add it.
      modifyRecords.push(data)
    }
    form.reset()
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full rounded-b-none rounded-t-lg">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e)
            }}
          >
            <CardHeader>
              <CardTitle>{t('addRecord.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="songSlug"
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col">
                        <FormLabel>{t('addRecord.song.label')}</FormLabel>
                        <SearchSongAutocomplete
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            form.setValue('difficultyLevel', '')
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficultyLevel"
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col">
                        <FormLabel>{t('addRecord.difficulty.label')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!song}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('addRecord.difficulty.placeholder')}>
                              {(() => {
                                const chart = song?.charts.find(
                                  (chart) => chart.difficultyLevel === field.value
                                )
                                return `${chart?.difficultyLevel} (${chart?.difficultyDecimal.toFixed(1)})`
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {song?.charts.map((chart) => (
                              <SelectItem
                                key={chart.difficultyLevel}
                                value={chart.difficultyLevel}
                                className="flex w-full flex-1 flex-col items-start gap-1"
                                textValue={chart.difficultyLevel}
                              >
                                <SelectItemText asChild>
                                  <div className="text-base leading-none tracking-tight">
                                    {chart.difficultyLevel}
                                  </div>
                                </SelectItemText>
                                <div className="flex w-full items-center justify-between text-xs tabular-nums text-muted-foreground">
                                  <div>{chart.difficultyDecimal.toFixed(1)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t('addRecord.difficulty.chartBy', {
                                      designer: chart.chartDesigner,
                                    })}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="achievementRate"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <FormLabel>{t('addRecord.achievementRate.label')}</FormLabel>
                      <BufferedInput<number>
                        className="font-mono"
                        ref={field.ref}
                        placeholder={t('addRecord.achievementRate.placeholder')}
                        transformFromT={(v) => v.toFixed(0)}
                        transformToT={(v) => clamp(coerceToNumber(v), 0, 1010000)}
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-row gap-2">
              <Button type="submit" disabled={!form.formState.isValid}>
                <PlusIcon className="-ml-1 size-4" />
                {t('addRecord.button.add')}
              </Button>
              <Button
                variant="ghost"
                type="reset"
                onClick={() => form.reset()}
                disabled={!form.formState.isDirty}
              >
                {t('addRecord.button.reset')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <ChartRecordImportForm />
    </div>
  )
}

const ChartRecordImportForm: FC = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [, modifyRecords] = useChartRecords()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fetching, setFetching] = useState(false)

  const onImport = () => {
    const content = textareaRef.current?.value
    if (!content) {
      toast.error(t('addRecord.import.error.noContent'))
      return
    }

    const parsed = safeParseImport(content)
    if (parsed.isErr()) {
      toast.error(t('addRecord.import.error.parseFailed', { error: parsed.error }))
      return
    }

    const filtered = parsed.value.filter((record) => {
      return record.achievementRate !== 0
    })

    modifyRecords.set(filtered)
    setOpen(false)
  }

  return (
    <>
      <Credenza open={open} onOpenChange={setOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>{t('addRecord.import.dialog.title')}</CredenzaTitle>
            <CredenzaDescription>
              <Trans
                i18nKey="addRecord.import.dialog.description"
                components={{
                  code: <code />,
                }}
              >
                Paste the JSON content of <code>CloudSave</code> or{' '}
                <code>GetAllFolloweeSocialData</code> (currently only will import the data of your
                first friend) API response here. Your current records will be overwritten. You may
                also use &quot;Surge Local Reflect&quot; module to capture the data.
              </Trans>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={fetching}
                  onClick={() => {
                    setFetching(true)
                    fetch('https://localreflect.rotaeno.imgg.dev/v0/CloudSave')
                      .then((res) => res.json())
                      .then((data) => {
                        if (textareaRef.current) {
                          textareaRef.current.value = JSON.stringify(data)
                          onImport()
                        }
                      })
                      .catch(() => {
                        toast.error(t('addRecord.import.error.fetchFailed'))
                      })
                      .finally(() => {
                        setFetching(false)
                      })
                  }}
                >
                  {t('addRecord.import.dialog.localReflect')}
                </Button>

                <Button variant="link" size="sm" asChild>
                  <a
                    href="surge:///install-module?url=https%3A%2F%2Fraw.githubusercontent.com%2FGalvinGao%2Fsgmodule%2Frefs%2Fheads%2Fmain%2Frotaenolocalreflect.sgmodule"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Install Surge Local Reflect Module
                  </a>
                </Button>
              </div>
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaBody>
            <Textarea
              ref={textareaRef}
              className="scroll-pb-2 font-mono text-xs"
              rows={15}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={t('addRecord.import.dialog.placeholder')}
            />
          </CredenzaBody>

          <CredenzaFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('addRecord.import.dialog.cancel')}
            </Button>
            <Button onClick={onImport} disabled={fetching}>
              {t('addRecord.import.dialog.confirm')}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>

      <Card className="w-full rounded-b-lg rounded-t-none border-t-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('addRecord.import.title')}</CardTitle>

          <Button variant="outline" onClick={() => setOpen(true)}>
            {t('addRecord.import.button')}
          </Button>
        </CardHeader>
      </Card>
    </>
  )
}
