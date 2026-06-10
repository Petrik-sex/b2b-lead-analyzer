import type { WebAnalysis } from "@/lib/types";

const positiveCtaWords = ["rezerv", "kontakt", "objedn", "cen", "menu", "booking", "book", "call"];
const photoWords = ["gallery", "galeria", "foto", "image", "instagram"];
const socialWords = ["instagram", "facebook", "linkedin"];
const vrWords = ["virtual tour", "virtualna prehliadka", "virtuálna prehliadka", "360", "matterport", "vr prehliadka"];
const marketingWords = ["utm_", "gtm.js", "googletagmanager", "google-analytics", "meta pixel", "fbq("];
const chatbotWords = ["chat", "messenger", "intercom", "tawk", "crisp", "drift", "smartsupp"];

function decodeContactValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

function detectPublicContacts(html: string) {
  const email = decodeContactValue(html.match(/href\s*=\s*["']mailto:([^"'?]+)/i)?.[1]);
  const phone = decodeContactValue(html.match(/href\s*=\s*["']tel:([^"']+)/i)?.[1]);
  const socialUrl =
    html.match(/href\s*=\s*["'](https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com)\/[^"']+)/i)?.[1] ?? null;

  return {
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    phone,
    socialUrl
  };
}

function isPublicWebsite(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const blocked =
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    return (url.protocol === "http:" || url.protocol === "https:") && !blocked;
  } catch {
    return false;
  }
}

function baseAnalysis(overrides: Partial<WebAnalysis>): WebAnalysis {
  return {
    has_website: false,
    modern_feel: false,
    clear_cta: false,
    mobile_usable: false,
    has_pricing_menu_booking: false,
    quality_photos: false,
    social_presence: false,
    financial_report_available: false,
    has_vr_tour: false,
    vr_potential: false,
    marketing_potential: false,
    chatbot_potential: false,
    detected_public_phone: null,
    detected_public_email: null,
    detected_social_url: null,
    social_analysis: "Sociálne siete nie sú zatiaľ uložené alebo rozpoznané.",
    financial_report_note: "Finančný report sa má overiť iba z verejných registrov alebo dodaných dát.",
    vr_tour_note: "VR prehliadka nebola rozpoznaná.",
    marketing_note: "Marketingové značky alebo kampane neboli rozpoznané.",
    chatbot_note: "Chatbot nebol rozpoznaný.",
    visible_problems: [],
    summary: "",
    ...overrides
  };
}

export async function analyzeWebsite(url: string | null | undefined): Promise<WebAnalysis> {
  if (!url) {
    return baseAnalysis({
      has_website: false,
      social_presence: false,
      financial_report_available: false,
      has_vr_tour: false,
      vr_potential: true,
      marketing_potential: true,
      chatbot_potential: false,
      social_analysis: "Bez webu sa sociálne siete majú overiť cez verejné firemné profily alebo CSV import.",
      financial_report_note: "Finančný report nebol kontrolovaný, chýba web alebo identifikátor firmy.",
      vr_tour_note: "Ak má firma fyzický priestor, VR prehliadka môže byť silná úvodná ponuka.",
      marketing_note: "Bez webu je najprv príležitosť vybudovať základnú merateľnú online prezentáciu.",
      chatbot_note: "Chatbot dáva zmysel až po existujúcom webe alebo jasnom rezervačnom procese.",
      visible_problems: ["Firma nemá uložený web."],
      summary: "Bez webu je hlavná príležitosť vytvoriť základnú dôveryhodnú prezentáciu a merateľný kontakt."
    });
  }

  if (!isPublicWebsite(url)) {
    return baseAnalysis({
      has_website: true,
      visible_problems: ["Uložená webová adresa nie je bezpečná verejná URL."],
      summary: "Automatická kontrola bola zastavená, pretože URL nesmeruje na verejnú webstránku."
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "B2B Lead Analyzer research bot; contact source verification"
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) {
      throw new Error(`Web vrátil HTTP ${response.status}`);
    }
    const html = (await response.text()).slice(0, 1_500_000);
    const lower = html.toLowerCase();
    const detectedContacts = detectPublicContacts(html);
    const hasViewport = lower.includes("name=\"viewport") || lower.includes("name='viewport");
    const clearCta = positiveCtaWords.some((word) => lower.includes(word));
    const hasMedia = photoWords.some((word) => lower.includes(word)) || /<img\s/i.test(html);
    const hasSocial = Boolean(detectedContacts.socialUrl) || socialWords.some((word) => lower.includes(word));
    const hasPricing = ["cenník", "cennik", "price", "menu", "rezerv", "booking"].some((word) => lower.includes(word));
    const hasVrTour = vrWords.some((word) => lower.includes(word));
    const hasMarketingTags = marketingWords.some((word) => lower.includes(word));
    const hasChatbot = chatbotWords.some((word) => lower.includes(word));
    const mentionsAnnualReport = ["účtovná závierka", "uctovna zavierka", "výročná správa", "vyrocna sprava", "annual report"].some((word) =>
      lower.includes(word)
    );
    const scripts = (html.match(/<script/gi) ?? []).length;
    const modernFeel = hasViewport && scripts > 1 && html.length > 5000;
    const problems = [
      !clearCta ? "Na webe nie je jasne viditeľná výzva na kontakt alebo rezerváciu." : null,
      !hasViewport ? "Web nemusí byť dobre pripravený pre mobilné zariadenia." : null,
      !hasPricing ? "Cenník, menu alebo rezervácia nie sú ľahko rozpoznateľné." : null,
      !hasMedia ? "Web neukazuje dostatok vizuálneho materiálu." : null,
      !hasSocial ? "Sociálne siete nie sú z webu výrazne prelinkované." : null,
      !hasMarketingTags ? "Nie sú rozpoznané bežné marketingové a analytické značky." : null,
      !hasChatbot && hasPricing ? "Pri cenníku alebo rezervácii môže pomôcť chatbot na časté otázky." : null
    ].filter(Boolean) as string[];

    return baseAnalysis({
      has_website: true,
      modern_feel: modernFeel,
      clear_cta: clearCta,
      mobile_usable: hasViewport,
      has_pricing_menu_booking: hasPricing,
      quality_photos: hasMedia,
      social_presence: hasSocial,
      financial_report_available: mentionsAnnualReport,
      has_vr_tour: hasVrTour,
      vr_potential: !hasVrTour && (hasMedia || hasSocial),
      marketing_potential: !hasMarketingTags || !clearCta || hasSocial,
      chatbot_potential: !hasChatbot && (hasPricing || clearCta),
      detected_public_phone: detectedContacts.phone,
      detected_public_email: detectedContacts.email,
      detected_social_url: detectedContacts.socialUrl,
      social_analysis: hasSocial
        ? "Web odkazuje na sociálne siete, oplatí sa posúdiť konzistentnosť obsahu a kampaní."
        : "Sociálne siete nie sú výrazne prelinkované z webu, overiť Instagram/Facebook manuálne alebo cez import.",
      financial_report_note: mentionsAnnualReport
        ? "Web naznačuje dostupný finančný alebo výročný report. Hodnoty treba brať iba z verejného registra alebo dodaného dokumentu."
        : "Finančný report nebol na webe rozpoznaný. V produkcii overiť verejný register, nie generovať odhady.",
      vr_tour_note: hasVrTour
        ? "VR alebo 360 prehliadka už pravdepodobne existuje, vhodnejšia môže byť aktualizácia alebo marketing distribúcia."
        : "VR prehliadka nebola rozpoznaná, pri fyzickom priestore je to dobrá personalizovaná príležitosť.",
      marketing_note: hasMarketingTags
        ? "Web má rozpoznateľné marketingové alebo analytické značky, rozhovor smerovať skôr na výkon a konverzie."
        : "Nie sú rozpoznané bežné meracie značky, príležitosť je v meraní kampaní a lepšej konverzii.",
      chatbot_note: hasChatbot
        ? "Chat alebo chatbot je pravdepodobne nasadený, posúdiť kvalitu odpovedí a napojenie na rezervácie."
        : "Chatbot nebol rozpoznaný, môže pomôcť pri otázkach o cenách, rezerváciách alebo dostupnosti.",
      visible_problems: problems.length ? problems : ["Web pôsobí použiteľne, príležitosť je v zlepšení konverzie."],
      summary: problems.length
        ? "Automatická kontrola na pozadí prešla web, sociálne signály, VR, marketingové značky a chatbot potenciál."
        : "Web má základné prvky v poriadku, ďalší potenciál je v lepšej konverzii a meraní dopytov."
    });
  } catch {
    return baseAnalysis({
      has_website: true,
      social_presence: false,
      financial_report_available: false,
      has_vr_tour: false,
      vr_potential: true,
      marketing_potential: true,
      chatbot_potential: false,
      social_analysis: "Sociálne siete nebolo možné overiť, lebo web sa nenačítal.",
      financial_report_note: "Finančný report nebol kontrolovaný, web sa nenačítal.",
      vr_tour_note: "VR prehliadku treba overiť manuálne.",
      marketing_note: "Marketingové značky sa nepodarilo skontrolovať.",
      chatbot_note: "Chatbot sa nepodarilo skontrolovať.",
      visible_problems: ["Web sa nepodarilo načítať pri rýchlej kontrole."],
      summary: "Web je uložený, ale automatická kontrola ho nenačítala. Overiť manuálne pred kontaktovaním."
    });
  }
}
