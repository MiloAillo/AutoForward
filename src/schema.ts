import z from "zod";

export const IdParamSchema = z.object({
    id: z.coerce.number().int().positive()
})

export const ForwardRuleParamSchema = z.object({
    id: z.coerce.number().int().positive(),
    ruleId: z.coerce.number().int().positive()
})

export const CreateForwardSchema = z.object({
    listenId: z.string().min(1),
    sendId: z.string().min(1),
    ruleIds: z.array(z.number().int().positive()).default([])
})

export const CreateRuleSchema = z.object({
    title: z.string().min(1).max(190),
    description: z.string().min(1).max(190),
    rule: z.string().min(1)
})