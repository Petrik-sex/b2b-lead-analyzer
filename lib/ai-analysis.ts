import OpenAI from "openai";
import type { AiAnalysis, Lead, RecommendedService, WebAnalysis } from "@/lib/types";
import { services } from "@/lib/types";

function clampPriority(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 5;
  }
  return Math.min(10, Math.max(1, Math.round(parsed)));
}

function normalizeService(value: unknown, fallback: RecommendedService): RecommendedService {
  if (typeof value === "string" && services.includes(value as RecommendedService)) {
    return value as RecommendedService;
  }

  return fallback;
}

function calculatePriority(lead: Lead, analysis: WebAnalysis | null) {
  let score = 3;

  if (!analysis) {
    return lead.public_phone || lead.public_email ? 5 : 4;
  }

  if (!analysis.has_website) score += 2;
  if (analysis.has_website && !analysis.modern_feel) score += 1;
  if (!analysis.clear_cta) score += 1;
  if (!analysis.mobile_usable) score += 1;
  if (analysis.vr_potential) score += 1;
  if (analysis.marketing_potential) score += 1;
  if (analysis.chatbot_potential) score += 1;
  if (lead.public_phone || lead.public_email) score += 1;

  return Math.min(10, Math.max(1, score));
}

function fallbackAnalysis(lead: Lead, webAnalysis: WebAnalysis | null): AiAnalysis {
  const service =
    lead.desired_service ??
    (webAnalysis?.chatbot_potential ? "chatbot" : webAnalysis?.vr_potential ? "VR prehliadky" : webAnalysis?.marketing_potential ? "marketing" : "webstránky");
  const problem = webAnalysis?.visible_problems?.[0] ?? "Online prezentácia má priestor na jasnejší obchodný výsledok.";

  return {
    main_problem: problem,
    sales_angle: `Navrhnúť službu ${service} ako konkrétne zlepšenie online rozhodovania zákazníka.`,
    recommended_service: service,
    business_note: `Kontaktovať prirodzene cez pozorovanie: ${problem}`,
    call_script: `Dobrý deň, volám sa Peter. Pozeral som si ${lead.company_name} a všimol som si, že ${problem.toLowerCase()} Robíme riešenia ako ${service}, ktoré pomáhajú ľuďom jednoduchšie sa rozhodnúť pred kontaktom alebo návštevou. Malo by zmysel, keby som vám poslal krátku ukážku?`,
    priority_score: calculatePriority(lead, webAnalysis)
  };
}

export async function generateAiAnalysis(lead: Lead, webAnalysis: WebAnalysis | null): Promise<AiAnalysis> {
  const fallback = fallbackAnalysis(lead, webAnalysis);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Na základe týchto údajov:
- názov firmy: ${lead.company_name}
- odvetvie: ${lead.industry}
- web: ${lead.website ?? "neuvedený"}
- popis firmy: ${lead.description ?? "neuvedený"}
- viditeľné problémy webu: ${(webAnalysis?.visible_problems ?? []).join("; ") || "neuvedené"}
- sociálne siete: ${lead.social_url ?? "neuvedené"}
- analýza sociálnych sietí: ${webAnalysis?.social_analysis ?? "neuvedené"}
- finančný report: ${webAnalysis?.financial_report_note ?? "neuvedené"}
- má VR prehliadku: ${webAnalysis?.has_vr_tour ? "áno" : "nie alebo nerozpoznané"}
- VR poznámka: ${webAnalysis?.vr_tour_note ?? "neuvedené"}
- marketing: ${webAnalysis?.marketing_note ?? "neuvedené"}
- chatbot: ${webAnalysis?.chatbot_note ?? "neuvedené"}
- služby, ktoré vieme ponúknuť: webstránky, VR prehliadky, marketing, chatbot

Vygeneruj JSON:
{
  "main_problem": "",
  "sales_angle": "",
  "recommended_service": "",
  "business_note": "",
  "call_script": "",
  "priority_score": 1
}

Call script musí byť prirodzený, krátky, slovenský, neagresívny, personalizovaný a do 30 sekúnd. Nepoužívaj vymyslené telefónne čísla, nevymýšľaj finančné čísla a nepíš spamový jazyk.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Si slovenský B2B sales research asistent. Vracaj iba validný JSON. Pomáhaš s kvalitným researchom, nie so spamom."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}");

    return {
      main_problem: String(parsed.main_problem || fallback.main_problem),
      sales_angle: String(parsed.sales_angle || fallback.sales_angle),
      recommended_service: normalizeService(parsed.recommended_service, fallback.recommended_service),
      business_note: String(parsed.business_note || fallback.business_note),
      call_script: String(parsed.call_script || fallback.call_script),
      priority_score: clampPriority(parsed.priority_score || fallback.priority_score)
    };
  } catch (error) {
    console.error("OpenAI analysis failed, using deterministic fallback.", error);
    return fallback;
  }
}
