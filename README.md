# B2B Lead Analyzer

Next.js + Tailwind CSS aplikácia na B2B lead research, web analýzu a prípravu krátkych sales poznámok.

## Funkcie

- Dashboard tabuľka leadov s filtrami podľa mesta, odvetvia, služby, priority a statusu.
- Detail firmy so základnými údajmi, zdrojom kontaktu, analýzou webu, odporúčanou ponukou, call scriptom a poznámkami.
- CSV import a export.
- API endpointy pre leady, zmenu statusu, poznámky, analýzu a export.
- Supabase/PostgreSQL schéma v `supabase/schema.sql`.
- OpenAI analýza s bezpečným fallbackom, keď `OPENAI_API_KEY` nie je nastavený.
- Automatická analýza všetkých nových leadov na pozadí: web, sociálne siete, verejný finančný register, VR prehliadka, marketing a chatbot potenciál.
- Voliteľné mobilné výkonnostné skóre cez PageSpeed Insights API.
- Google Places vyhľadávanie verejných firemných profilov s ochranou proti duplicitám.
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

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY` a `PAGESPEED_API_KEY` sú serverové tajomstvá a nikdy nepatria do verejného repozitára.

Bez Supabase aplikácia používa iba dočasné demo dáta. Ak je Supabase nakonfigurovaný a databáza zlyhá, aplikácia zobrazí chybu namiesto predstierania úspešného uloženia.

Bez OpenAI sa vytvorí deterministická bezpečná analýza. Bez Google Places sa vytvorí iba research záznam s verejným Google Maps vyhľadávacím odkazom, nikdy nie vymyslený kontakt.

Finančné čísla sa negenerujú ani neodhadujú. Aplikácia odkazuje na Register účtovných závierok; presný report treba spárovať podľa názvu a IČO firmy.

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
