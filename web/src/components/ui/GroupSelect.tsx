import { useId, useMemo, useState } from "react"
import { Check, RefreshCw, Search, Users, X } from "lucide-react"
import { cn, shortJid } from "../../lib/format"
import type { GroupsMap } from "../../types"

export function GroupSelect({
    groups,
    value,
    onChange,
    label,
    placeholder = "Search groups…",
    disabledJid,
    loading = false,
    onRefresh
}: {
    groups: GroupsMap
    value: string
    onChange: (jid: string) => void
    label: string
    placeholder?: string
    disabledJid?: string
    loading?: boolean
    onRefresh?: () => void
}) {
    const listId = useId()
    const [query, setQuery] = useState("")
    const [activeIndex, setActiveIndex] = useState(0)

    const options = useMemo(() => {
        const entries = Object.entries(groups).map(([jid, info]) => ({
            jid,
            subject: typeof info.subject === "string" && info.subject.trim() ? info.subject : shortJid(jid),
            isCustom: false
        }))
        entries.sort((a, b) => a.subject.localeCompare(b.subject))

        const needle = query.trim().toLowerCase()
        const filtered = needle
            ? entries.filter(
                  (entry) =>
                      entry.subject.toLowerCase().includes(needle) ||
                      entry.jid.toLowerCase().includes(needle)
              )
            : entries

        const trimmed = query.trim()
        if (trimmed && !entries.some((e) => e.jid.toLowerCase() === trimmed.toLowerCase())) {
            const normalizedJid = trimmed.includes("@") ? trimmed : `${trimmed}@g.us`
            return [
                { jid: normalizedJid, subject: `Use custom JID: ${normalizedJid}`, isCustom: true },
                ...filtered.slice(0, 120)
            ]
        }

        return filtered.slice(0, 120)
    }, [groups, query])

    const selected = value ? groups[value] : undefined
    const selectedLabel =
        selected && typeof selected.subject === "string" && selected.subject.trim()
            ? selected.subject
            : value
              ? shortJid(value)
              : null

    const choose = (jid: string) => {
        if (jid === disabledJid) return
        onChange(jid)
        setQuery("")
        setActiveIndex(0)
    }

    return (
        <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-ink" htmlFor={`${listId}-input`}>
                {label}
            </label>

            {value && (
                <div className="flex items-center gap-2 rounded-[10px] border border-accent/35 bg-accent/[0.07] px-2.5 py-2">
                    <Check className="size-3.5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium">{selectedLabel}</p>
                        <p className="truncate font-mono text-[10px] text-faint">{value}</p>
                    </div>
                    <button
                        type="button"
                        aria-label={`Clear ${label}`}
                        onClick={() => onChange("")}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                <input
                    id={`${listId}-input`}
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                    value={query}
                    placeholder={placeholder}
                    onChange={(event) => {
                        setQuery(event.target.value)
                        setActiveIndex(0)
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                            event.preventDefault()
                            setActiveIndex((index) => Math.min(options.length - 1, index + 1))
                        } else if (event.key === "ArrowUp") {
                            event.preventDefault()
                            setActiveIndex((index) => Math.max(0, index - 1))
                        } else if (event.key === "Enter") {
                            event.preventDefault()
                            const option = options[activeIndex]
                            if (option) choose(option.jid)
                        }
                    }}
                    className="h-10 w-full rounded-[10px] border border-line-strong bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-[#3a4148] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
            </div>

            <ul
                id={listId}
                role="listbox"
                aria-label={label}
                className="max-h-44 overflow-y-auto rounded-[10px] border border-line bg-surface p-1"
            >
                {loading ? (
                    <li className="flex items-center gap-2 px-2.5 py-3 text-[12px] text-faint">
                        <Users className="size-3.5 animate-pulse" />
                        Loading groups from WhatsApp…
                    </li>
                ) : options.length === 0 ? (
                    <li className="flex flex-col gap-2 px-2.5 py-3 text-[12px] text-faint">
                        <div className="flex items-center gap-2">
                            <Users className="size-3.5" />
                            No groups cached yet. Connect the bot first.
                        </div>
                        {onRefresh && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-accent hover:underline"
                            >
                                <RefreshCw className="size-3" />
                                Refresh groups
                            </button>
                        )}
                    </li>
                ) : (
                    options.map((option, index) => {
                        const isSelected = option.jid === value
                        const isDisabled = option.jid === disabledJid
                        return (
                            <li
                                key={option.jid}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={isDisabled}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => choose(option.jid)}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors",
                                    isDisabled && "cursor-not-allowed opacity-40",
                                    activeIndex === index && !isDisabled && "bg-surface-2",
                                    isSelected && "bg-accent/10"
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12.5px] text-ink">{option.subject}</span>
                                    <span className="block truncate font-mono text-[9.5px] text-faint">
                                        {option.jid}
                                    </span>
                                </span>
                                {isSelected && <Check className="size-3.5 shrink-0 text-accent" />}
                            </li>
                        )
                    })
                )}
            </ul>
        </div>
    )
}
