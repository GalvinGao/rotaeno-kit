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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { CaretSortIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import { CommandLoading } from 'cmdk'
import Fuse from 'fuse.js'
import { Check, PlusIcon } from 'lucide-react'
import { FC, Suspense, useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const useFuse = () => {
  return useMemo(() => {
    return new Fuse(songs, {
      keys: [
        {
          name: 'name',
          weight: 1,
        },
        {
          name: 'category',
          weight: 0.5,
        },
      ],
      shouldSort: true,
      sortFn: (a, b) => {
        // Sort descending
        return a.score < b.score ? 1 : -1
      },
      threshold: 0.6,
    })
  }, [])
}

const SearchSongAutocomplete: FC<{
  value: string
  onValueChange: (value: string) => void
}> = ({ value, onValueChange }) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const fuse = useFuse()

  const searchResults = useMemo(() => {
    if (!query) {
      return songs
    }
    return fuse.search(query).map((result) => result.item)
  }, [query, fuse])

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
          className="w-full shrink justify-between"
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {value ? songs.find((song) => song.slug === value)?.name : 'Select song...'}
          </span>
          <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] max-w-[100vw] p-0">
        <Command>
          <CommandInput
            placeholder="Search song..."
            onValueChange={(value) => {
              setQuery(value)
            }}
          />
          <CommandList>
            <CommandEmpty>No chart found.</CommandEmpty>
            <CommandGroup className="scroll-pb-2">
              <Suspense fallback={<CommandLoading />}>
                {isPending ? (
                  <CommandLoading />
                ) : (
                  searchResults.map((song) => (
                    <CommandItem
                      key={song.slug}
                      value={song.slug}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue)
                        setOpen(false)
                      }}
                      className={clsx(
                        'flex items-center overflow-hidden text-ellipsis whitespace-nowrap',
                        value === song.slug &&
                          'bg-foreground text-background data-[selected=true]:bg-foreground/80 data-[selected=true]:text-background/80'
                      )}
                    >
                      {value === song.slug && <Check className="size-4" />}

                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {song.name}
                      </span>

                      <span className="ml-auto max-w-16 overflow-hidden text-ellipsis whitespace-nowrap text-right text-xs text-muted-foreground">
                        {song.category}
                      </span>
                    </CommandItem>
                  ))
                )}
              </Suspense>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const AddChartRecord: FC = () => {
  const [records, modifyRecords] = useChartRecords()

  const form = useForm<AddChartRecordForm>({
    resolver: zodResolver(addChartRecordFormSchema),
    defaultValues: {
      songSlug: '',
      difficultyLevel: '',
    },
  })

  const songSlug = form.watch('songSlug')
  const song = useMemo(() => {
    return songs.find((song) => song.slug === songSlug)
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
              <CardTitle>Add new record manually</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="songSlug"
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col">
                        <FormLabel>Song</FormLabel>
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
                        <FormLabel>Difficulty</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={!song}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty...">
                              {(() => {
                                const chart = song?.charts.find(
                                  (chart) => chart.difficultyLevel === field.value
                                )
                                return `${chart?.difficultyLevel} (${chart?.difficultyDecimal})`
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {song?.charts.map((chart) => (
                              <SelectItem
                                key={chart.defaultIndex}
                                value={chart.difficultyLevel}
                                className="flex w-full flex-1 flex-col items-start"
                                textValue={chart.difficultyLevel}
                              >
                                <SelectItemText className="font-mono text-sm tracking-tight">
                                  {chart.difficultyLevel}
                                </SelectItemText>
                                <div className="flex w-full items-center justify-between text-xs tabular-nums text-muted-foreground">
                                  <div>{chart.difficultyDecimal}</div>

                                  <div className="text-xs text-muted-foreground">
                                    Added in {chart.version}
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
                      <FormLabel>Achievement Rate</FormLabel>
                      <Input
                        type="number"
                        className="font-mono"
                        {...field}
                        min={0}
                        max={1010000}
                        placeholder="0995223"
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-row gap-2">
              <Button type="submit">
                <PlusIcon className="-ml-1 size-4" />
                Add
              </Button>
              <Button variant="ghost" type="reset" onClick={() => form.reset()}>
                Reset
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
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [, modifyRecords] = useChartRecords()

  const onImport = () => {
    const parsed = safeParseImport(content)
    if (parsed.isErr()) {
      toast.error(`Failed to parse import: ${parsed.error}`)
      return
    }

    modifyRecords.set(parsed.value)
    setOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from HTTP capture</DialogTitle>
            <DialogDescription>
              Paste the JSON content of <code>CloudSave</code> or{' '}
              <code>GetAllFolloweeSocialData</code> (currently only will import the data of your
              first friend) api response here. Your current records will be overwritten.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="scroll-pb-2 font-mono"
            rows={10}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="w-full rounded-b-lg rounded-t-none border-t-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Import from HTTP capture (advanced)</CardTitle>

          <Button variant="outline" onClick={() => setOpen(true)}>
            Import
          </Button>
        </CardHeader>
      </Card>
    </>
  )
}
