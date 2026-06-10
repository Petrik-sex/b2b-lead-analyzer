import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/lead-store";
import { leadSchema, normalizeLeadInput } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: Params) {
  const lead = await getLead(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead sa nenašiel." }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const existing = await getLead(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Lead sa nenašiel." }, { status: 404 });
    }

    const payload = await request.json();
    const merged = leadSchema.parse({ ...existing, ...payload });
    const normalized = normalizeLeadInput(merged);
    const updated = await updateLead(params.id, {
      ...normalized,
      web_analysis: existing.web_analysis,
      ai_analysis: existing.ai_analysis
    });
    return NextResponse.json({ lead: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nepodarilo sa upraviť lead." }, { status: 400 });
  }
}
