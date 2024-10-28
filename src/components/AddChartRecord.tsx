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
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AddChartRecordForm,
  addChartRecordFormSchema,
  useChartRecords,
} from '@/contexts/ChartRecordsContext'
import { songs } from '@/data/songs'
import { zodResolver } from '@hookform/resolvers/zod'
import { CaretSortIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import { Check, PlusIcon } from 'lucide-react'
import { FC, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

const useFuse = () => {
  return useMemo(() => {
    return new Fuse(songs, {
      keys: ['name', 'category'],
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
  const [query, setQuery] = useState('')
  const fuse = useFuse()

  const searchResults = useMemo(() => {
    if (!query) {
      return songs
    }
    return fuse.search(query).map((result) => result.item)
  }, [query, fuse])

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              {searchResults.map((song) => (
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
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const AddChartRecord: FC = () => {
  const [, modifyRecords] = useChartRecords()

  const form = useForm<AddChartRecordForm>({
    resolver: zodResolver(addChartRecordFormSchema),
    defaultValues: {
      chartSlug: '',
      difficultyLevel: '',
    },
  })

  const chartSlug = form.watch('chartSlug')
  const song = useMemo(() => {
    return songs.find((song) => song.slug === chartSlug)
  }, [chartSlug])

  const onSubmit = (data: AddChartRecordForm) => {
    modifyRecords.push(data)
    form.reset()
  }

  return (
    <Card className="w-full max-w-2xl">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e)
          }}
        >
          <CardHeader>
            <CardTitle>Add Chart Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <FormField
                  control={form.control}
                  name="chartSlug"
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
                      <FormLabel>Difficulty Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!song}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          {song?.charts.map((chart) => (
                            <SelectItem key={chart.defaultIndex} value={chart.difficultyLevel}>
                              {chart.difficultyLevel} ({chart.difficultyDecimal})
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
  )
}
