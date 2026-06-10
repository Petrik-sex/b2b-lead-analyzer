import { NextResponse } from "next/server";
import Papa from "papaparse";
import { listLeads } from "@/lib/lead-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await listLeads();
  const rows = leads.map((lead) => ({
    company_name: lead.company_name,
    industry: lead.industry,
    city: lead.city,
    website: lead.website,
    public_phone: lead.public_phone,
    public_email: lead.public_email,
    google_maps_url: lead.google_maps_url,
    social_url: lead.social_url,
    data_source: lead.data_source,
    contact_source: lead.contact_source,
    status: lead.status,
    recommended_service: lead.ai_analysis?.recommended_service ?? lead.desired_service,
    priority_score: lead.ai_analysis?.priority_score,
    main_problem: lead.ai_analysis?.main_problem,
    sales_angle: lead.ai_analysis?.sales_angle,
    business_note: lead.ai_analysis?.business_note,
    call_script: lead.ai_analysis?.call_script,
    website_summary: lead.web_analysis?.summary,
    social_analysis: lead.web_analysis?.social_analysis,
    financial_report_note: lead.web_analysis?.financial_report_note,
    has_vr_tour: lead.web_analysis?.has_vr_tour,
    vr_tour_note: lead.web_analysis?.vr_tour_note,
    marketing_note: lead.web_analysis?.marketing_note,
    chatbot_note: lead.web_analysis?.chatbot_note,
    notes: lead.notes
  }));
  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="b2b-leads-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
