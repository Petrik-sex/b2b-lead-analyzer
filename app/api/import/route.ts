import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createLead } from "@/lib/lead-store";
import { leadSchema, normalizeLeadInput } from "@/lib/validation";

type CsvRow = Record<string, string | undefined>;

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nahrajte CSV súbor." }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
    const created = [];
    const errors = [];

    for (const [index, row] of parsed.data.entries()) {
      const lead = {
        company_name: pick(row, ["company_name", "nazov", "názov", "firma", "name"]),
        industry: pick(row, ["industry", "odvetvie", "segment"]) ?? "neuvedené",
        city: pick(row, ["city", "mesto", "region", "región"]) ?? "neuvedené",
        website: pick(row, ["website", "web", "url"]) ?? null,
        public_phone: pick(row, ["public_phone", "phone", "telefon", "telefón"]) ?? null,
        public_email: pick(row, ["public_email", "email", "e-mail"]) ?? null,
        google_maps_url: pick(row, ["google_maps_url", "maps", "google_maps"]) ?? null,
        social_url: pick(row, ["social_url", "instagram", "facebook", "social"]) ?? null,
        data_source: pick(row, ["data_source", "zdroj_dat", "zdroj dát", "source"]) ?? `CSV import: ${file.name}`,
        contact_source: pick(row, ["contact_source", "zdroj_kontaktu", "zdroj kontaktu"]) ?? `CSV import: ${file.name}`,
        description: pick(row, ["description", "popis"]) ?? null,
        status: "new",
        desired_service: null,
        notes: null
      };

      const result = leadSchema.safeParse(lead);
      if (!result.success) {
        errors.push({ row: index + 2, error: result.error.issues[0]?.message ?? "Neplatný riadok" });
        continue;
      }

      created.push(await createLead(normalizeLeadInput(result.data)));
    }

    return NextResponse.json({ imported: created.length, errors, leads: created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import zlyhal." }, { status: 500 });
  }
}
