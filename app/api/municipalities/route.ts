import { NextResponse } from "next/server";
import { slovakMunicipalities } from "@/lib/slovak-municipalities";

export const dynamic = "force-dynamic";

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizeText(searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ municipalities: [] });
  }

  const majorMatches = majorCities
    .filter((name) => normalizeText(name).startsWith(query))
    .map((name) => ({
      name,
      type: "mesto",
      district: name,
      region: "",
      code: `major-${normalizeText(name).replace(/\s/g, "-")}`
    }));

  const municipalityMatches = slovakMunicipalities
    .filter((item) => normalizeText(item.name).startsWith(query))
    .sort((a, b) => a.name.localeCompare(b.name, "sk"))
    .slice(0, 36);

  const seen = new Set(majorMatches.map((item) => item.name));
  const matches = [...majorMatches, ...municipalityMatches.filter((item) => !seen.has(item.name))].slice(0, 36);

  return NextResponse.json({ municipalities: matches });
}
