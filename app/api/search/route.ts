import { NextResponse } from "next/server";
import { createLead } from "@/lib/lead-store";
import { services } from "@/lib/types";
import { leadSchema, normalizeLeadInput } from "@/lib/validation";

type GooglePlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
};

function cleanIndustry(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function cleanCity(location: string, formattedAddress: string | undefined) {
  if (!formattedAddress) {
    return location;
  }

  const parts = formattedAddress.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.find((part) => part.toLowerCase().includes(location.toLowerCase())) ?? location;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const selectedBusinessType = String(payload.businessType ?? "").trim();
    const businessType = selectedBusinessType === "všetky" ? "firmy" : selectedBusinessType;
    const location = String(payload.location ?? "").trim();
    const service = services.includes(payload.service) ? payload.service : "webstránky";

    if (!businessType || !location) {
      return NextResponse.json({ error: "Vyberte typ biznisu a mesto alebo región." }, { status: 400 });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      const demo = leadSchema.parse({
        company_name: `${businessType.slice(0, 1).toUpperCase()}${businessType.slice(1)} - ${location}`,
        industry: selectedBusinessType,
        city: location,
        website: null,
        public_phone: null,
        public_email: null,
        google_maps_url: `https://www.google.com/maps/search/${encodeURIComponent(`${businessType} ${location}`)}`,
        social_url: null,
        data_source: "Research záznam - Google Places API zatiaľ nie je pripojené",
        contact_source: "Google Maps vyhľadávací odkaz; verejný kontakt treba pred oslovením overiť",
        description: `Pripravený research záznam pre ${businessType} v lokalite ${location}.`,
        status: "new",
        desired_service: service,
        notes: "Bez vymysleného telefónu alebo e-mailu. Doplniť iba verejne dostupný firemný kontakt alebo CSV import."
      });
      const lead = await createLead(normalizeLeadInput(demo));
      return NextResponse.json({ leads: [lead], mode: "demo" });
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": [
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.internationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.primaryTypeDisplayName",
          "places.editorialSummary"
        ].join(",")
      },
      body: JSON.stringify({
        textQuery: `${businessType} ${location}`,
        languageCode: "sk",
        regionCode: "SK",
        maxResultCount: 10
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        {
          error: "Google Places vyhľadávanie zlyhalo. Skontrolujte API kľúč, Places API (New) a billing.",
          detail: message.slice(0, 600)
        },
        { status: 502 }
      );
    }

    const result = (await response.json()) as { places?: GooglePlace[] };
    const places = result.places ?? [];
    const created = [];
    const errors = [];

    for (const [index, place] of places.entries()) {
      const companyName = place.displayName?.text?.trim();
      if (!companyName) {
        continue;
      }

      const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null;
      const lead = leadSchema.safeParse({
        company_name: companyName,
        industry: cleanIndustry(place.primaryTypeDisplayName?.text, selectedBusinessType),
        city: cleanCity(location, place.formattedAddress),
        website: place.websiteUri ?? null,
        public_phone: phone,
        public_email: null,
        google_maps_url: place.googleMapsUri ?? `https://www.google.com/maps/search/${encodeURIComponent(`${companyName} ${location}`)}`,
        social_url: null,
        data_source: "Google Places API - verejný firemný profil",
        contact_source: phone
          ? "Google Places API - verejne uvedený firemný telefón"
          : "Google Places API - verejný firemný profil; telefón alebo e-mail nebol zverejnený",
        description: place.editorialSummary?.text ?? place.formattedAddress ?? null,
        status: "new",
        desired_service: service,
        notes: null
      });

      if (!lead.success) {
        errors.push({ row: index + 1, error: lead.error.issues[0]?.message ?? "Neplatný lead z Google Places" });
        continue;
      }

      created.push(await createLead(normalizeLeadInput(lead.data)));
    }

    return NextResponse.json({ leads: created, errors, mode: "google_places" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vyhľadávanie firiem zlyhalo." },
      { status: 500 }
    );
  }
}
