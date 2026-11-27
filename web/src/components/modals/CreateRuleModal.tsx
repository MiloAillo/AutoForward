import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Field, Input, Textarea } from "../ui/Field"
import { useToast } from "../ui/Toast"
import { botApi } from "../../lib/api"

const MAX_TITLE = 190
const MAX_DESCRIPTION = 190

export function CreateRuleModal({
    open,
    onClose,
    onCreated
}: {
    open: boolean
    onClose: () => void
    onCreated: () => void
}) {
    const { toast } = useToast()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [rule, setRule] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setTitle("")
        setDescription("")
        setRule("")
        setError(null)
        setSubmitting(false)
    }, [open])

    const submit = async () => {
        if (!title.trim() || !description.trim() || !rule.trim()) {
            setError("Title, description and rule prompt are all required.")
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            await botApi.createRule({
                title: title.trim(),
                description: description.trim(),
                rule: rule.trim()
            })
            toast({ title: "Rule created", description: "It can now be linked to a forward.", tone: "success" })
            onCreated()
            onClose()
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to create rule")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Create rule"
            description="A rule is an instruction the AI uses to decide whether a message should be forwarded."
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={submit} loading={submitting}>
                        Create rule
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field
                    label="Title"
                    htmlFor="rule-title"
                    hint="Short name shown on the forward map."
                    counter={
                        <span className="font-mono text-[10px] text-faint">
                            {title.length}/{MAX_TITLE}
                        </span>
                    }
                >
                    <Input
                        id="rule-title"
                        value={title}
                        maxLength={MAX_TITLE}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Urgent only"
                    />
                </Field>

                <Field
                    label="Description"
                    htmlFor="rule-description"
                    counter={
                        <span className="font-mono text-[10px] text-faint">
                            {description.length}/{MAX_DESCRIPTION}
                        </span>
                    }
                >
                    <Input
                        id="rule-description"
                        value={description}
                        maxLength={MAX_DESCRIPTION}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Only forward messages that need a same-day response"
                    />
                </Field>

                <Field
                    label="Rule prompt"
                    htmlFor="rule-prompt"
                    hint="Written for the model. Be explicit about what should and should not pass."
                >
                    <Textarea
                        id="rule-prompt"
                        value={rule}
                        onChange={(event) => setRule(event.target.value)}
                        placeholder="Forward only if the message contains a deadline, an explicit request for action, or words like urgent, ASAP, or today."
                    />
                </Field>

                {error && (
                    <div
                        className="flex items-start gap-2 rounded-[10px] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] px-3 py-2"
                        role="alert"
                    >
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                        <p className="text-[12px] leading-relaxed text-danger">{error}</p>
                    </div>
                )}
            </div>
        </Modal>
    )
}
