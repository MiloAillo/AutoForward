import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { RefreshCw, Smartphone } from "lucide-react"
import { Button } from "../ui/Button"
import { cn } from "../../lib/format"

export function QrPanel({
    qr,
    onRefresh,
    refreshing
}: {
    qr: string
    onRefresh: () => void
    refreshing: boolean
}) {
    const [spinning, setSpinning] = useState(false)
    const handleRefresh = () => {
        setSpinning(true)
        onRefresh()
        setTimeout(() => setSpinning(false), 650)
    }
    return (
        <section
            className={cn(
                "panel flex flex-col gap-5 border-[color-mix(in_oklab,var(--color-warn)_28%,var(--color-line))] p-4 sm:flex-row sm:items-center sm:p-5"
            )}
            aria-label="WhatsApp pairing"
        >
            <div className="grid shrink-0 place-items-center rounded-xl bg-white p-3 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9)]">
                <QRCodeSVG value={qr} size={132} level="M" bgColor="#ffffff" fgColor="#0a0a0b" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-warn" />
                    <h2 className="text-[14px] font-semibold">Link your WhatsApp account</h2>
                </div>
                <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted">
                    Open WhatsApp on your phone, go to <span className="text-ink">Settings → Linked devices</span>,
                    tap <span className="text-ink">Link a device</span>, and scan this code.
                </p>
                <p className="mt-1 text-[11.5px] text-faint">
                    The code refreshes automatically while the socket waits for pairing.
                </p>
            </div>

            <Button
                variant="secondary"
                size="sm"
                className="shrink-0 self-start sm:self-center"
                icon={<RefreshCw className={cn("size-3.5 transition-transform", (refreshing || spinning) && "animate-spin")} />}
                onClick={handleRefresh}
            >
                Refresh
            </Button>
        </section>
    )
}
