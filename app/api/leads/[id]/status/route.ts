import { NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/lead-store";
import { statusSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { status } = statusSchema.parse(await request.json());
    const lead = await updateLeadStatus(params.id, status);
    if (!lead) {
      return NextResponse.json({ error: "Lead sa nenašiel." }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nepodarilo sa zmeniť status." }, { status: 400 });
  }
}
