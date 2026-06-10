import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/lead-store";
import { noteSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { note } = noteSchema.parse(await request.json());
    const lead = await getLead(params.id);
    if (!lead) {
      return NextResponse.json({ error: "Lead sa nenašiel." }, { status: 404 });
    }

    const timestamp = new Date().toLocaleString("sk-SK");
    const notes = [lead.notes, `[${timestamp}] ${note}`].filter(Boolean).join("\n");
    const updated = await updateLead(params.id, { notes });

    return NextResponse.json({ lead: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nepodarilo sa pridať poznámku." }, { status: 400 });
  }
}
