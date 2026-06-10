import { z } from "zod";
import type { LeadInput } from "@/lib/types";
import { leadStatuses, services } from "@/lib/types";

const blankToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const leadSchema = z
  .object({
    id: z.string().optional(),
    company_name: z.string().min(1, "Názov firmy je povinný"),
    industry: z.string().min(1, "Odvetvie je povinné"),
    city: z.string().min(1, "Mesto je povinné"),
    website: z.preprocess(blankToNull, z.string().url().nullable().optional()),
    public_phone: z.preprocess(blankToNull, z.string().nullable().optional()),
    public_email: z.preprocess(blankToNull, z.string().email().nullable().optional()),
    google_maps_url: z.preprocess(blankToNull, z.string().url().nullable().optional()),
    social_url: z.preprocess(blankToNull, z.string().url().nullable().optional()),
    data_source: z.string().min(1, "Zdroj dát je povinný"),
    contact_source: z.string().min(1, "Zdroj kontaktu je povinný"),
    description: z.preprocess(blankToNull, z.string().nullable().optional()),
    status: z.enum(leadStatuses).default("new"),
    desired_service: z.enum(services).nullable().optional(),
    notes: z.preprocess(blankToNull, z.string().nullable().optional()),
    web_analysis: z.unknown().nullable().optional(),
    ai_analysis: z.unknown().nullable().optional()
  })
  .refine((lead) => lead.public_phone || lead.public_email || lead.website || lead.google_maps_url, {
    message: "Lead musí mať verejný alebo importovaný kontakt, web alebo Google Maps zdroj.",
    path: ["contact_source"]
  });

export const statusSchema = z.object({
  status: z.enum(leadStatuses)
});

export const noteSchema = z.object({
  note: z.string().min(1)
});

export function normalizeLeadInput(lead: z.infer<typeof leadSchema>): LeadInput {
  return {
    ...lead,
    website: lead.website ?? null,
    public_phone: lead.public_phone ?? null,
    public_email: lead.public_email ?? null,
    google_maps_url: lead.google_maps_url ?? null,
    social_url: lead.social_url ?? null,
    description: lead.description ?? null,
    desired_service: lead.desired_service ?? null,
    notes: lead.notes ?? null,
    web_analysis: null,
    ai_analysis: null
  };
}
