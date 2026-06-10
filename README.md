# B2B Lead Analyzer

Next.js + Tailwind CSS aplikácia na B2B lead research, web analýzu a prípravu krátkych sales poznámok.

## Funkcie

- Dashboard tabuľka leadov s filtrami podľa mesta, odvetvia, služby, priority a statusu.
- Detail firmy so základnými údajmi, zdrojom kontaktu, analýzou webu, odporúčanou ponukou, call scriptom a poznámkami.
- CSV import a export.
- API endpointy pre leady, zmenu statusu, poznámky, analýzu a export.
- Supabase/PostgreSQL schéma v `supabase/schema.sql`.
- OpenAI analýza s bezpečným fallbackom, keď `OPENAI_API_KEY` nie je nastavený.
- Automatická analýza na pozadí pre vybraný lead: web, sociálne siete, verejne overiteľný finančný report, VR prehliadka, marketing a chatbot potenciál.
- Demo režim bez Supabase, ktorý drží dáta v pamäti servera.

## Bezpečnostné pravidlá kontaktov

- Aplikácia negeneruje náhodné telefónne čísla.
- Každý lead musí mať `contact_source`.
- Kontakty majú pochádzať z verejne dostupných firemných zdrojov alebo z CSV importu.
- Google Places fallback vytvorí len research placeholder s Google Maps search linkom, nie falošné kontakty.
- Status workflow: `new`, `contacted`, `interested`, `not_interested`, `callback`, `closed`.

## Spustenie

```bash
npm install
npm run dev
```

Otvorte `http://localhost:3000`.

## Premenné prostredia

Skopírujte `.env.example` do `.env.local` a doplňte:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GOOGLE_PLACES_API_KEY=
PAGESPEED_API_KEY=
```

Bez Supabase/OpenAI kľúčov aplikácia beží v demo režime.

## CSV import

Podporované názvy stĺpcov:

- `company_name`, `nazov`, `názov`, `firma`, `name`
- `industry`, `odvetvie`, `segment`
- `city`, `mesto`, `region`, `región`
- `website`, `web`, `url`
- `public_phone`, `phone`, `telefon`, `telefón`
- `public_email`, `email`, `e-mail`
- `google_maps_url`, `maps`, `google_maps`
- `social_url`, `instagram`, `facebook`, `social`
- `data_source`, `zdroj_dat`, `zdroj dát`, `source`
- `contact_source`, `zdroj_kontaktu`, `zdroj kontaktu`
- `description`, `popis`

## API

- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `PATCH /api/leads/:id/status`
- `POST /api/leads/:id/notes`
- `POST /api/leads/:id/analyze`
- `POST /api/import`
- `GET /api/export`
- `POST /api/search`
