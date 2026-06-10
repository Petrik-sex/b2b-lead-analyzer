import { NextResponse } from "next/server";
import { generateAiAnalysis } from "@/lib/ai-analysis";
import { getLead, updateLead } from "@/lib/lead-store";
import { analyzeWebsite } from "@/lib/web-analysis";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_: Request, { params }: Params) {
  try {
    const lead = await getLead(params.id);
    if (!lead) {
      return NextResponse.json({ error: "Lead sa nenašiel." }, { status: 404 });
    }

    const webAnalysis = await analyzeWebsite(lead.website, lead.company_name);
    const aiAnalysis = await generateAiAnalysis(lead, webAnalysis);
    const detectedContact =
      (!lead.public_phone && webAnalysis.detected_public_phone) ||
      (!lead.public_email && webAnalysis.detected_public_email) ||
      (!lead.social_url && webAnalysis.detected_social_url);
    const websiteContactSource = lead.website ? `Verejná webstránka firmy: ${lead.website}` : null;
    const contactSource =
      detectedContact && websiteContactSource && !lead.contact_source.includes(websiteContactSource)
        ? `${lead.contact_source}; ${websiteContactSource}`
        : lead.contact_source;
    const updated = await updateLead(params.id, {
      web_analysis: webAnalysis,
      ai_analysis: aiAnalysis,
      desired_service: aiAnalysis.recommended_service,
      public_phone: lead.public_phone ?? webAnalysis.detected_public_phone,
      public_email: lead.public_email ?? webAnalysis.detected_public_email,
      social_url: lead.social_url ?? webAnalysis.detected_social_url,
      contact_source: contactSource
    });

    return NextResponse.json({ lead: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analýza zlyhala." }, { status: 500 });
  }
}
