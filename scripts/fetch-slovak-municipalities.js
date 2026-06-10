const fs = require("fs");
const path = require("path");

const sourceUrl = "https://www.mapaobce.sk/zoznam-obci/podla-nazvu";
const outputPath = path.join(__dirname, "..", "prototype", "municipalities.js");

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&darr;/g, "↓")
    .trim();
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

async function main() {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch municipalities: ${response.status}`);
  }

  const html = await response.text();
  const rowMatches = html.matchAll(/<tr>\s*<td><small>(.*?)<\/small><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gs);
  const items = [];

  for (const match of rowMatches) {
    const code = stripTags(match[1]);
    const nameCell = match[2];
    const name = stripTags(nameCell.replace(/\s*\(mesto\)\s*/g, ""));
    const district = stripTags(match[3]);
    const region = stripTags(match[4]);
    const type = nameCell.includes("(mesto)") ? "mesto" : "obec";

    if (name && district && region) {
      items.push({ name, type, district, region, code });
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "sk"));

  const content = `// Generated from ${sourceUrl}
// Source distinguishes towns with the "(mesto)" marker.
window.SLOVAK_MUNICIPALITIES = ${JSON.stringify(items, null, 2)};
`;

  fs.writeFileSync(outputPath, content);
  console.log(`Saved ${items.length} municipalities to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
