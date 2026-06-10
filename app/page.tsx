import { LeadDashboard } from "@/components/lead-dashboard";
import { listLeads } from "@/lib/lead-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const leads = await listLeads();
  return <LeadDashboard initialLeads={leads} />;
}
