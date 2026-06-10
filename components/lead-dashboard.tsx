"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileUp,
  Filter,
  Globe,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import { leadStatuses, services, type Lead, type LeadStatus } from "@/lib/types";

type Props = {
  initialLeads: Lead[];
};

type LocationSuggestion = {
  name: string;
  type: string;
  district: string;
  region: string;
  code: string;
};

const emptyFilters = {
  city: "",
  industry: "",
  service: "",
  priority: "",
  status: ""
};

const businessTypeOptions = [
  "všetky",
  "hotely",
  "reštaurácie",
  "fitness centrá",
  "showroomy",
  "wellness centrá",
  "zubné kliniky",
  "realitné kancelárie",
  "autoservisy"
];

const majorCities = [
  "Bratislava",
  "Košice",
  "Prešov",
  "Žilina",
  "Banská Bystrica",
  "Nitra",
  "Trnava",
  "Trenčín",
  "Martin",
  "Poprad"
];

const statusLabels: Record<LeadStatus, string> = {
  new: "Nový",
  contacted: "Kontaktovaný",
  interested: "Má záujem",
  not_interested: "Nemá záujem",
  callback: "Zavolať neskôr",
  closed: "Uzatvorený"
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function priority(lead: Lead) {
  return lead.ai_analysis?.priority_score ?? 0;
}

function serviceFor(lead: Lead) {
  return lead.ai_analysis?.recommended_service ?? lead.desired_service ?? "";
}

function priorityReason(lead: Lead) {
  if (!lead.ai_analysis) {
    return "Priorita sa vypočíta po otvorení reportu podľa kvality webu, CTA, mobilnej použiteľnosti, VR, marketingového a chatbot potenciálu.";
  }

  const signals = lead.web_analysis
    ? [
        !lead.web_analysis.has_website ? "chýbajúci web" : null,
        !lead.web_analysis.clear_cta ? "slabé CTA" : null,
        !lead.web_analysis.mobile_usable ? "slabá mobilná použiteľnosť" : null,
        lead.web_analysis.vr_potential ? "VR potenciál" : null,
        lead.web_analysis.marketing_potential ? "marketingový potenciál" : null,
        lead.web_analysis.chatbot_potential ? "chatbot potenciál" : null
      ].filter(Boolean)
    : [];

  return signals.length
    ? `Skóre vychádza zo signálov: ${signals.join(", ")}.`
    : "Skóre vychádza z dostupnosti kontaktu, kvality online prezentácie a obchodnej príležitosti.";
}

function groupLocations(items: LocationSuggestion[]) {
  return [
    {
      title: "Veľké mestá",
      items: items.filter((item) => majorCities.includes(item.name))
    },
    {
      title: "Mestské časti",
      items: items.filter((item) => normalizeText(item.name).includes("mestska cast"))
    },
    {
      title: "Ostatné mestá",
      items: items.filter(
        (item) =>
          item.type === "mesto" &&
          !majorCities.includes(item.name) &&
          !normalizeText(item.name).includes("mestska cast")
      )
    },
    {
      title: "Obce",
      items: items.filter((item) => item.type !== "mesto")
    }
  ].filter((group) => group.items.length > 0);
}

function AnalysisFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex min-h-9 items-center gap-2 border-b border-line/70 py-2 text-sm last:border-b-0">
      {value ? <Check size={15} className="shrink-0 text-mint" /> : <X size={15} className="shrink-0 text-slate-600" />}
      <span className={value ? "text-slate-200" : "text-slate-500"}>{label}</span>
    </div>
  );
}

export function LeadDashboard({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [expandedId, setExpandedId] = useState("");
  const [callLeadId, setCallLeadId] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [searchIntent, setSearchIntent] = useState({ businessType: "", location: "", service: "" });
  const [showBusinessOptions, setShowBusinessOptions] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState({ done: 0, total: 0 });
  const [isPending, startTransition] = useTransition();
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const businessPickerRef = useRef<HTMLDivElement>(null);
  const analyzedIds = useRef(new Set<string>());

  const filterOptions = useMemo(
    () => ({
      cities: Array.from(new Set(leads.map((lead) => lead.city))).filter(Boolean).sort((a, b) => a.localeCompare(b, "sk")),
      industries: Array.from(new Set(leads.map((lead) => lead.industry))).filter(Boolean).sort((a, b) => a.localeCompare(b, "sk"))
    }),
    [leads]
  );

  const locationGroups = useMemo(() => groupLocations(locationSuggestions), [locationSuggestions]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const minPriority = filters.priority ? Number(filters.priority) : 0;
      return (
        (!filters.city || lead.city === filters.city) &&
        (!filters.industry || lead.industry === filters.industry) &&
        (!filters.service || serviceFor(lead) === filters.service) &&
        (!filters.status || lead.status === filters.status) &&
        (!minPriority || priority(lead) >= minPriority)
      );
    });
  }, [filters, leads]);

  function patchLead(updated: Lead) {
    setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
  }

  function runTask(task: () => Promise<void>) {
    setMessage("");
    startTransition(async () => {
      try {
        await task();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Akcia zlyhala.");
      }
    });
  }

  async function refreshLeads() {
    const response = await fetch("/api/leads", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Leady sa nepodarilo obnoviť.");
    }
    setLeads(data.leads ?? []);
  }

  async function analyzeLead(id: string) {
    if (analyzedIds.current.has(id)) {
      return;
    }

    analyzedIds.current.add(id);
    setMessage("Na pozadí kontrolujem web, sociálne siete, VR, marketing a chatbot potenciál.");
    try {
      const response = await fetch(`/api/leads/${id}/analyze`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Analýza zlyhala.");
      }
      patchLead(data.lead);
      setMessage("Analýza reportu je pripravená.");
    } catch (error) {
      analyzedIds.current.delete(id);
      setMessage(error instanceof Error ? error.message : "Analýza zlyhala.");
    }
  }

  async function analyzeLeadsInBackground(ids: string[]) {
    const pendingIds = ids.filter((id) => !analyzedIds.current.has(id));
    if (!pendingIds.length) {
      return;
    }

    pendingIds.forEach((id) => analyzedIds.current.add(id));
    setAnalysisProgress({ done: 0, total: pendingIds.length });
    setMessage(`Analyzujem 0 z ${pendingIds.length} nových firiem na pozadí.`);
    let cursor = 0;
    let completed = 0;
    let failed = 0;

    async function worker() {
      while (cursor < pendingIds.length) {
        const id = pendingIds[cursor++];
        try {
          const response = await fetch(`/api/leads/${id}/analyze`, { method: "POST" });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error ?? "Analýza zlyhala.");
          }
          patchLead(data.lead);
        } catch {
          failed += 1;
          analyzedIds.current.delete(id);
        } finally {
          completed += 1;
          setAnalysisProgress({ done: completed, total: pendingIds.length });
          setMessage(`Analyzujem ${completed} z ${pendingIds.length} nových firiem na pozadí.`);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(2, pendingIds.length) }, () => worker()));
    setAnalysisProgress({ done: pendingIds.length, total: pendingIds.length });
    setMessage(
      failed
        ? `Analýza dokončená: ${pendingIds.length - failed} úspešných, ${failed} treba skúsiť znovu otvorením reportu.`
        : `Hotovo. Analyzovaných firiem: ${pendingIds.length}.`
    );
  }

  function toggleLead(lead: Lead) {
    const opening = expandedId !== lead.id;
    setExpandedId(opening ? lead.id : "");
    setCallLeadId("");
    setNote("");

    if (opening && !lead.web_analysis) {
      void analyzeLead(lead.id);
    }
  }

  useEffect(() => {
    function closePickers(event: MouseEvent) {
      const target = event.target as Node;
      if (!locationPickerRef.current?.contains(target)) {
        setShowLocationOptions(false);
      }
      if (!businessPickerRef.current?.contains(target)) {
        setShowBusinessOptions(false);
      }
    }

    document.addEventListener("mousedown", closePickers);
    return () => document.removeEventListener("mousedown", closePickers);
  }, []);

  useEffect(() => {
    const query = searchIntent.location.trim();
    if (!query) {
      setLocationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/municipalities?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        setLocationSuggestions(data.municipalities ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setLocationSuggestions([]);
        }
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchIntent.location]);

  function createSearchLeads(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runTask(async () => {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(searchIntent)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Vyhľadanie zlyhalo.");
      }
      await refreshLeads();
      setMessage(
        data.mode === "demo"
          ? "Pridaný research záznam. Reálne firmy zapneme cez Google Places API."
          : `Pridané firmy: ${data.leads?.length ?? 0}. Preskočené duplicity: ${data.skippedDuplicates ?? 0}.`
      );
      void analyzeLeadsInBackground((data.leads ?? []).map((lead: Lead) => lead.id));
    });
  }

  function changeStatus(id: string, status: LeadStatus) {
    runTask(async () => {
      const response = await fetch(`/api/leads/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Status sa nepodarilo zmeniť.");
      }
      patchLead(data.lead);
    });
  }

  function addNote(event: FormEvent<HTMLFormElement>, lead: Lead) {
    event.preventDefault();
    if (!note.trim()) {
      return;
    }

    runTask(async () => {
      const response = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Poznámku sa nepodarilo pridať.");
      }
      patchLead(data.lead);
      setNote("");
    });
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    runTask(async () => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Import zlyhal.");
      }
      await refreshLeads();
      setMessage(`Importované: ${data.imported}. Chyby: ${data.errors?.length ?? 0}.`);
      void analyzeLeadsInBackground((data.leads ?? []).map((lead: Lead) => lead.id));
      event.target.value = "";
    });
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-mint/15 text-mint">
              <Bot size={21} />
            </div>
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">B2B Lead Analyzer</h1>
              <p className="text-sm text-slate-400">Verejné B2B kontakty, analýza príležitosti a obchodný workflow.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export" className="action-button">
              <ArrowDownToLine size={16} /> Export CSV
            </a>
            <label className="action-button cursor-pointer">
              <FileUp size={16} /> Import CSV
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={importCsv} />
            </label>
          </div>
        </header>

        <form onSubmit={createSearchLeads} className="border-b border-line pb-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Search size={16} className="text-mint" /> Nájsť firmy
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div ref={businessPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setShowBusinessOptions((current) => !current)}
                className={`field flex w-full items-center justify-between text-left ${searchIntent.businessType ? "text-slate-100" : "text-slate-500"}`}
              >
                <span>{searchIntent.businessType || "vyberte názov biznisu"}</span>
                <ChevronDown size={15} />
              </button>
              {showBusinessOptions ? (
                <div className="dropdown-panel">
                  {businessTypeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSearchIntent((current) => ({ ...current, businessType: option }));
                        setShowBusinessOptions(false);
                      }}
                      className="dropdown-option"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div ref={locationPickerRef} className="relative">
              <input
                value={searchIntent.location}
                onChange={(event) => {
                  setSearchIntent((current) => ({ ...current, location: event.target.value }));
                  setShowLocationOptions(true);
                }}
                onFocus={() => setShowLocationOptions(Boolean(searchIntent.location.trim()))}
                className="field w-full"
                placeholder="vyberte miesto"
                autoComplete="off"
              />
              {showLocationOptions && locationGroups.length > 0 ? (
                <div className="dropdown-panel max-h-80 overflow-y-auto">
                  {locationGroups.map((group) => (
                    <div key={group.title}>
                      <div className="sticky top-0 border-y border-line bg-[#10151d] px-3 py-2 text-[11px] font-semibold uppercase text-slate-500 first:border-t-0">
                        {group.title}
                      </div>
                      {group.items.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setSearchIntent((current) => ({ ...current, location: item.name }));
                            setShowLocationOptions(false);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-white/5"
                        >
                          <span className="block text-sm text-slate-200">{item.name}</span>
                          <span className="block text-xs text-slate-500">
                            {item.type === "mesto" ? "Mesto" : "Obec"} · okres {item.district}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <select
              value={searchIntent.service}
              onChange={(event) => setSearchIntent((current) => ({ ...current, service: event.target.value }))}
              className={`field ${searchIntent.service ? "text-slate-100" : "text-slate-500"}`}
            >
              <option value="" disabled>typ prevádzky</option>
              {services.map((service) => <option key={service}>{service}</option>)}
            </select>

            <button disabled={isPending} className="primary-button">
              {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Nájsť leady
            </button>
          </div>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Filter size={16} className="text-amber" /> Filtre
            </div>
            <span className="text-xs text-slate-500">{filteredLeads.length} z {leads.length} leadov</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select className="field" value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })}>
              <option value="">Všetky mestá</option>
              {filterOptions.cities.map((city) => <option key={city}>{city}</option>)}
            </select>
            <select className="field" value={filters.industry} onChange={(event) => setFilters({ ...filters, industry: event.target.value })}>
              <option value="">Všetky odvetvia</option>
              {filterOptions.industries.map((industry) => <option key={industry}>{industry}</option>)}
            </select>
            <select className="field" value={filters.service} onChange={(event) => setFilters({ ...filters, service: event.target.value })}>
              <option value="">Všetky služby</option>
              {services.map((service) => <option key={service}>{service}</option>)}
            </select>
            <select className="field" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
              <option value="">Každá priorita</option>
              {[5, 6, 7, 8, 9].map((score) => <option key={score} value={score}>{score} a viac</option>)}
            </select>
            <select className="field" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Každý status</option>
              {leadStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
        </section>

        {message ? (
          <div className="flex items-center gap-2 border-l-2 border-mint bg-mint/5 px-3 py-2 text-sm text-slate-300">
            {isPending || (analysisProgress.total > 0 && analysisProgress.done < analysisProgress.total) ? (
              <RefreshCw size={15} className="animate-spin text-mint" />
            ) : (
              <ShieldCheck size={15} className="text-mint" />
            )}
            {message}
          </div>
        ) : null}

        <section className="overflow-hidden border border-line bg-panel/65">
          <div className="hidden grid-cols-[44px_1.4fr_.8fr_.9fr_1fr_100px_150px_160px_28px] gap-3 border-b border-line bg-white/[0.025] px-3 py-2 text-[11px] font-semibold uppercase text-slate-500 xl:grid">
            <span></span>
            <span>Názov</span>
            <span>Mesto</span>
            <span>Odvetvie</span>
            <span>Služba</span>
            <span>Priorita</span>
            <span>Status</span>
            <span>Kontakt</span>
            <span></span>
          </div>

          {filteredLeads.length ? (
            filteredLeads.map((lead) => {
              const expanded = expandedId === lead.id;
              return (
                <article key={lead.id} className="border-b border-line last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleLead(lead)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleLead(lead);
                      }
                    }}
                    className={`grid cursor-pointer gap-3 px-3 py-3 transition hover:bg-white/[0.035] xl:grid-cols-[44px_1.4fr_.8fr_.9fr_1fr_100px_150px_160px_28px] xl:items-center ${expanded ? "bg-white/[0.035]" : ""}`}
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-white/5 text-slate-300">
                      <Building2 size={17} />
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-100">{lead.company_name}</strong>
                      <span className="block truncate text-xs text-slate-500">{lead.data_source}</span>
                    </div>
                    <span className="text-sm text-slate-300">{lead.city}</span>
                    <span className="text-sm text-slate-300">{lead.industry}</span>
                    <span className="text-sm text-slate-300">{serviceFor(lead) || "Vyhodnotí analýza"}</span>
                    <div title={priorityReason(lead)} className="flex items-center gap-2 text-sm">
                      <span className="flex size-8 items-center justify-center rounded-md bg-amber/10 font-semibold text-amber">
                        {priority(lead) || "–"}
                      </span>
                    </div>
                    <div onClick={(event) => event.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(event) => changeStatus(lead.id, event.target.value as LeadStatus)}
                        className="field h-9 w-full py-0 text-xs"
                        aria-label={`Status pre ${lead.company_name}`}
                      >
                        {leadStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                      </select>
                    </div>
                    <div onClick={(event) => event.stopPropagation()}>
                      <span className="block truncate text-xs text-slate-400">
                        {lead.public_phone || lead.public_email || "Kontakt neoverený"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCallLeadId((current) => current === lead.id ? "" : lead.id)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-mint hover:text-mint/80"
                      >
                        <Phone size={13} /> hneď volať
                      </button>
                    </div>
                    <ChevronRight size={17} className={`text-slate-500 transition ${expanded ? "rotate-90" : ""}`} />
                  </div>

                  {callLeadId === lead.id ? (
                    <div className="border-t border-line bg-black/15 px-4 py-3">
                      {lead.public_phone ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="block text-xs text-slate-500">Verejný firemný telefón</span>
                            <strong className="text-sm text-slate-100">{lead.public_phone}</strong>
                          </div>
                          <a href={`tel:${lead.public_phone.replace(/\s/g, "")}`} className="primary-button">
                            <Phone size={16} /> Zavolať teraz
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">
                          Táto firma nemá uložený verejne overený telefón. Aplikácia žiadne číslo nevymyslí.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {expanded ? (
                    <div className="border-t border-line bg-[#0b0e14] px-4 py-5">
                      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_1fr]">
                        <div>
                          <h3 className="section-title">Firma a kontakt</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-300"><MapPin size={14} /> {lead.city}</div>
                            {lead.website ? (
                              <a href={lead.website} target="_blank" rel="noreferrer" className="detail-link">
                                <Globe size={14} /> Web firmy <ExternalLink size={12} />
                              </a>
                            ) : <div className="text-slate-500">Web nie je uložený</div>}
                            {lead.google_maps_url ? (
                              <a href={lead.google_maps_url} target="_blank" rel="noreferrer" className="detail-link">
                                <MapPin size={14} /> Google Maps <ExternalLink size={12} />
                              </a>
                            ) : null}
                            {lead.public_phone ? (
                              <a href={`tel:${lead.public_phone.replace(/\s/g, "")}`} className="detail-link">
                                <Phone size={14} /> {lead.public_phone}
                              </a>
                            ) : null}
                            {lead.public_email ? (
                              <a href={`mailto:${lead.public_email}`} className="detail-link">
                                <Mail size={14} /> {lead.public_email}
                              </a>
                            ) : null}
                            <p className="border-l border-line pl-3 text-xs leading-5 text-slate-500">
                              Zdroj kontaktu: {lead.contact_source}
                            </p>
                          </div>

                          <h3 className="section-title mt-6">Priorita {priority(lead) || "–"}/10</h3>
                          <p className="text-sm leading-6 text-slate-400">{priorityReason(lead)}</p>
                        </div>

                        <div>
                          <h3 className="section-title">Analýza prevádzky</h3>
                          {lead.web_analysis ? (
                            <>
                              <AnalysisFlag label="Má webstránku" value={lead.web_analysis.has_website} />
                              <AnalysisFlag label="Web pôsobí moderne" value={lead.web_analysis.modern_feel} />
                              <AnalysisFlag label="Má jasné CTA" value={lead.web_analysis.clear_cta} />
                              <AnalysisFlag label="Je použiteľný na mobile" value={lead.web_analysis.mobile_usable} />
                              <AnalysisFlag label="Má cenník, menu alebo rezerváciu" value={lead.web_analysis.has_pricing_menu_booking} />
                              <AnalysisFlag label="Má kvalitné fotky" value={lead.web_analysis.quality_photos} />
                              <AnalysisFlag label="Má VR prehliadku" value={lead.web_analysis.has_vr_tour} />
                              <AnalysisFlag label="Má sociálne signály" value={lead.web_analysis.social_presence} />
                            </>
                          ) : (
                            <div className="flex items-center gap-2 py-5 text-sm text-slate-500">
                              <RefreshCw size={15} className="animate-spin" /> Analýza prebieha na pozadí…
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="section-title">Odporúčaná ponuka</h3>
                          {lead.ai_analysis ? (
                            <div className="space-y-4 text-sm">
                              <div>
                                <span className="detail-label">Hlavná príležitosť</span>
                                <p className="leading-6 text-slate-300">{lead.ai_analysis.main_problem}</p>
                              </div>
                              <div>
                                <span className="detail-label">Selling point</span>
                                <p className="leading-6 text-slate-300">{lead.ai_analysis.sales_angle}</p>
                              </div>
                              <div>
                                <span className="detail-label">Odporúčaná služba</span>
                                <strong className="text-mint">{lead.ai_analysis.recommended_service}</strong>
                              </div>
                              <div>
                                <span className="detail-label">Poznámka obchodníka</span>
                                <p className="leading-6 text-slate-300">{lead.ai_analysis.business_note}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="py-5 text-sm text-slate-500">Ponuka sa pripravuje spolu s analýzou.</p>
                          )}
                        </div>
                      </div>

                      {lead.web_analysis ? (
                        <div className="mt-6 grid gap-5 border-t border-line pt-5 lg:grid-cols-3">
                          <div>
                            <h3 className="section-title">Research poznámky</h3>
                            <div className="space-y-3 text-sm leading-6 text-slate-400">
                              <p><span className="detail-label">Sociálne siete</span>{lead.web_analysis.social_analysis}</p>
                              <p><span className="detail-label">Finančný report</span>{lead.web_analysis.financial_report_note}</p>
                              <p><span className="detail-label">VR</span>{lead.web_analysis.vr_tour_note}</p>
                              <p><span className="detail-label">Marketing</span>{lead.web_analysis.marketing_note}</p>
                              <p><span className="detail-label">Chatbot</span>{lead.web_analysis.chatbot_note}</p>
                              <p><span className="detail-label">Mobilný výkon</span>{lead.web_analysis.performance_note ?? "PageSpeed meranie nebolo spustené."}</p>
                              {lead.web_analysis.research_sources?.length ? (
                                <div>
                                  <span className="detail-label">Zdroje overenia</span>
                                  <div className="flex flex-col gap-2">
                                    {lead.web_analysis.research_sources.map((source) => (
                                      <a key={`${source.label}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="detail-link">
                                        {source.label} <ExternalLink size={12} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <h3 className="section-title">Telefonický skript</h3>
                            <div className="border-l-2 border-mint bg-mint/5 p-4 text-sm leading-6 text-slate-200">
                              {lead.ai_analysis?.call_script ?? "Skript sa pripravuje."}
                            </div>
                          </div>

                          <form onSubmit={(event) => addNote(event, lead)}>
                            <h3 className="section-title">Poznámky</h3>
                            <div className="mb-3 max-h-28 overflow-y-auto whitespace-pre-wrap bg-white/[0.025] p-3 text-xs leading-5 text-slate-400">
                              {lead.notes || "Bez poznámok."}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                className="field min-w-0 flex-1"
                                placeholder="Pridať poznámku"
                              />
                              <button className="icon-button" title="Pridať poznámku" aria-label="Pridať poznámku">
                                <MessageSquarePlus size={17} />
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="px-4 py-14 text-center">
              <Building2 size={24} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-400">Žiadne leady nezodpovedajú filtrom.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
