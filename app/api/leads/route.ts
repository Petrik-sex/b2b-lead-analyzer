import { NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/lead-store";
import { leadSchema, normalizeLeadInput } from "@/lib/validation";

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nepodarilo sa načítať leady." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const lead = leadSchema.parse(payload);
    const created = await createLead(normalizeLeadInput(lead));
    return NextResponse.json({ lead: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nepodarilo sa vytvoriť lead." }, { status: 400 });
  }
}
