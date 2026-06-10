export const leadStatuses = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "closed"
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const services = ["webstránky", "VR prehliadky", "marketing", "chatbot"] as const;

export type RecommendedService = (typeof services)[number];

export type WebAnalysis = {
  has_website: boolean;
  modern_feel: boolean;
  clear_cta: boolean;
  mobile_usable: boolean;
  has_pricing_menu_booking: boolean;
  quality_photos: boolean;
  social_presence: boolean;
  financial_report_available: boolean;
  has_vr_tour: boolean;
  vr_potential: boolean;
  marketing_potential: boolean;
  chatbot_potential: boolean;
  detected_public_phone: string | null;
  detected_public_email: string | null;
  detected_social_url: string | null;
  social_analysis: string;
  financial_report_note: string;
  vr_tour_note: string;
  marketing_note: string;
  chatbot_note: string;
  mobile_performance_score?: number | null;
  performance_note?: string;
  research_sources?: Array<{
    label: string;
    url: string;
  }>;
  visible_problems: string[];
  summary: string;
};

export type AiAnalysis = {
  main_problem: string;
  sales_angle: string;
  recommended_service: RecommendedService;
  business_note: string;
  call_script: string;
  priority_score: number;
};

export type Lead = {
  id: string;
  company_name: string;
  industry: string;
  city: string;
  website: string | null;
  public_phone: string | null;
  public_email: string | null;
  google_maps_url: string | null;
  social_url: string | null;
  data_source: string;
  contact_source: string;
  description: string | null;
  status: LeadStatus;
  desired_service: RecommendedService | null;
  web_analysis: WebAnalysis | null;
  ai_analysis: AiAnalysis | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadInput = Omit<Lead, "id" | "created_at" | "updated_at" | "web_analysis" | "ai_analysis"> & {
  id?: string;
  web_analysis?: WebAnalysis | null;
  ai_analysis?: AiAnalysis | null;
};

export type SearchIntent = {
  businessType: string;
  location: string;
  service: RecommendedService;
};
