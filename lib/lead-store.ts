import { demoLeads } from "@/lib/demo-data";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Lead, LeadInput, LeadStatus } from "@/lib/types";

const table = "leads";

type SharedLeadStore = typeof globalThis & {
  __b2bLeadAnalyzerLeads?: Lead[];
};

const sharedLeadStore = globalThis as SharedLeadStore;

function getMemoryLeads() {
  if (!sharedLeadStore.__b2bLeadAnalyzerLeads) {
    sharedLeadStore.__b2bLeadAnalyzerLeads = structuredClone(demoLeads);
  }

  return sharedLeadStore.__b2bLeadAnalyzerLeads;
}

function setMemoryLeads(leads: Lead[]) {
  sharedLeadStore.__b2bLeadAnalyzerLeads = leads;
}

function sortLeads(leads: Lead[]) {
  return [...leads].sort((a, b) => {
    const aScore = a.ai_analysis?.priority_score ?? 0;
    const bScore = b.ai_analysis?.priority_score ?? 0;
    return bScore - aScore || b.updated_at.localeCompare(a.updated_at);
  });
}

export async function listLeads() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return sortLeads(getMemoryLeads());
  }

  const { data, error } = await supabase.from(table).select("*").order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase: leady sa nepodarilo načítať (${error.message}).`);
  }

  return sortLeads((data ?? []) as Lead[]);
}

export async function getLead(id: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return getMemoryLeads().find((lead) => lead.id === id) ?? null;
  }

  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Supabase: lead sa nepodarilo načítať (${error.message}).`);
  }

  return data as Lead;
}

function createMemoryLead(input: LeadInput) {
  const now = new Date().toISOString();
  const created = {
    ...input,
    id: input.id ?? `local-${crypto.randomUUID()}`,
    web_analysis: input.web_analysis ?? null,
    ai_analysis: input.ai_analysis ?? null,
    created_at: now,
    updated_at: now
  } as Lead;
  setMemoryLeads([created, ...getMemoryLeads()]);
  return created;
}

export async function createLead(input: LeadInput) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return createMemoryLead(input);
  }

  const { data, error } = await supabase.from(table).insert(input).select("*").single();
  if (error) {
    throw new Error(`Supabase: lead sa nepodarilo uložiť (${error.message}).`);
  }

  return data as Lead;
}

function updateMemoryLead(id: string, patch: Partial<Lead>) {
  const memoryLeads = getMemoryLeads();
  const existing = memoryLeads.find((lead) => lead.id === id);
  if (!existing) {
    return null;
  }

  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() } as Lead;
  setMemoryLeads(memoryLeads.map((lead) => (lead.id === id ? updated : lead)));
  return updated;
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return updateMemoryLead(id, patch);
  }

  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select("*").single();
  if (error) {
    throw new Error(`Supabase: lead sa nepodarilo aktualizovať (${error.message}).`);
  }

  return data as Lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return updateLead(id, { status });
}
