# Home ERP

Kotitalouden ruokajärjestelmä: varasto, ostoslista, reseptit, ateriasuunnitelma, pakastin ja vakio-ostokset. Kun varaston tuote vähenee, se siirtyy ostoslistalle. Kun ostos merkitään ostetuksi, varasto päivittyy. Sovellus toimii puhelimessa kotinäytölle asennettavana web-sovelluksena (PWA), ja Claude voi käyttää sitä MCP-yhteyden kautta.

*A self-hosted household food ERP (pantry, shopping list, recipes, meal plans) for one household. The UI is in Finnish. Deploys to Vercel and Supabase free tiers.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftomipienimaki-stack%2Fhome-erp-public&project-name=home-erp&repository-name=home-erp&env=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,SINGLE_USER_ID,CRON_SECRET&envDescription=Supabase-projektin%20arvot%20ja%20oma%20k%C3%A4ytt%C3%A4j%C3%A4tunnus.%20CRON_SECRET%20on%20mik%C3%A4%20tahansa%20pitk%C3%A4%20satunnainen%20merkkijono.&envLink=https%3A%2F%2Fgithub.com%2Ftomipienimaki-stack%2Fhome-erp-public%23asennus)

Jokainen asennus on oma, yhden käyttäjän palvelunsa. Tietosi ovat omassa Supabase-projektissasi, eikä kukaan muu näe niitä. Vercelin Hobby- ja Supabasen Free-taso riittävät kotikäyttöön.

## Asennus

Varaa aikaa noin 15 minuuttia. Tarvitset tilit palveluihin [Supabase](https://supabase.com), [Vercel](https://vercel.com) ja GitHub.

### 1. Supabase

1. Luo uusi Supabase-projekti.
2. Avaa **SQL Editor → New query**, liitä tiedoston [`supabase/schema.sql`](supabase/schema.sql) koko sisältö ja aja se.
3. Avaa **Authentication → Users → Add user → Create new user** ja luo itsellesi käyttäjä sähköpostilla ja salasanalla. Kopioi käyttäjän **UID**.
4. Avaa **Authentication → Sign In / Providers** ja poista käytöstä **Allow new users to sign up**. Sovellus on yhden käyttäjän, joten muiden ei pidä päästä rekisteröitymään.
5. Avaa **Project Settings → API** (tai **API Keys**) ja kopioi talteen projektin URL, julkinen anon-avain ja palveluavain (service role / secret).

### 2. Vercel

Paina yllä olevaa **Deploy with Vercel** -nappia. Vercel kopioi koodin omaan GitHub-tiliisi ja kysyy nämä arvot:

| Muuttuja | Arvo |
|---|---|
| `SUPABASE_URL` | Supabase-projektin URL, esim. `https://abcd1234.supabase.co` |
| `SUPABASE_ANON_KEY` | Julkinen anon-avain. Tämä päätyy selaimeen, ja se on tarkoitettu siihen. |
| `SUPABASE_SERVICE_ROLE_KEY` | Palveluavain. Käytetään vain palvelimella. Älä jaa sitä kenellekään. |
| `SINGLE_USER_ID` | Vaiheessa 1.3 kopioimasi käyttäjän UID |
| `CRON_SECRET` | Mikä tahansa pitkä satunnainen merkkijono, esim. komennon `openssl rand -hex 32` tulos |

Kun julkaisu on valmis, avaa sovelluksen osoite ja kirjaudu sisään vaiheessa 1.3 luomillasi tunnuksilla. Puhelimessa saat sovelluksen kotinäytölle selaimen jakovalikosta (**Lisää kotivalikkoon**).

### 3. Valinnaiset ominaisuudet

Lisää nämä myöhemmin Vercelissä kohdassa **Project → Settings → Environment Variables** ja julkaise uudelleen.

| Muuttuja | Mitä se avaa |
|---|---|
| `ANTHROPIC_API_KEY` | Reseptin tuonti kuvasta, ateriasuunnitelman generointi ja kauppojen suosikkilistojen tuonti. Avain saadaan osoitteesta [console.anthropic.com](https://console.anthropic.com). Ilman avainta muu sovellus toimii normaalisti. |
| `HOME_ERP_API_TOKEN` | Clauden MCP-yhteys (katso alla). Pitkä satunnainen merkkijono. |

## Claude-yhteys (MCP)

Kansiossa `mcp/` on MCP-palvelin, jonka kautta Claude-työpöytäsovellus lukee ja muokkaa varastoa, ostoslistaa, reseptejä ja ruokalistoja. Palvelin ajetaan omalla koneellasi, ja se kutsuu Vercelissä olevaa sovellustasi.

```bash
git clone <oma-repositoriosi> home-erp
cd home-erp/mcp && npm install && npm run build
```

Lisää Claude-sovelluksen asetustiedostoon `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`). Node-polun saat komennolla `which node`.

```json
{
  "mcpServers": {
    "home-erp": {
      "command": "/polku/node",
      "args": ["/polku/home-erp/mcp/dist/index.js"],
      "env": {
        "HOME_ERP_API": "https://<sovelluksesi>.vercel.app/api",
        "HOME_ERP_API_TOKEN": "<sama arvo kuin Vercelissä>",
        "HOME_ERP_HOUSEHOLD_NOTES": "Valinnainen: kotitaloutesi tavat, esim. kokkaan 2–3 kertaa viikossa."
      }
    }
  }
}
```

Käynnistä Claude-sovellus uudelleen. Työkalut: `pantry_*`, `shopping_*`, `recipe(s)_*`, `meal_plan_*`, `freezer_*`, `staple(s)_*`, `food_preference(s)_*`, `settings_*`.

## Varastotasot

| Taso | Mitä | Miten seurataan |
|---|---|---|
| perus | suola, sokeri, jauhot, öljyt, kuivamausteet, liemikuutiot, pasta, riisi | Oletetaan olevan. Ei ostoslistalle ruokalistalta. "Loppu" merkitään käsin. |
| sailyva | säilykkeet, tahnat, erikoiskuivatuotteet, pakastemarjat | Tila on / vähissä / loppu. Vähissä ja loppu lisäävät ostoslistalle, ostos palauttaa tilan "on". |
| tarkistettava | sipulit, valkosipuli, peruna, porkkana, kananmunat, voi, kovat juustot | Ei saldoa. Ruokalista lisää ostoslistan osioon "Tarkista ennen kauppaa". |
| tuore | liha, kala, maitotuotteet, tuoreet vihannekset ja yrtit | Ostetaan ruokalistan mukaan. Ylijäämälle määrä ja parasta ennen -päivä. |

Pakastin: `freezer_items`, valmiit annokset kappaleina (`/freezer`).

## Rakenne

```
home-erp/
├── api/index.js   Vercel-funktio, joka ajaa backendin
├── backend/       NestJS-rajapinta (Supabasen palveluavaimella)
├── frontend/      Vite + React + TypeScript + Tailwind, PWA
├── mcp/           MCP-palvelin Claudelle
├── supabase/      schema.sql ja migraatiot
└── vercel.json    Build, reititys ja päivittäiset ajot
```

Selain kutsuu rajapintaa polussa `/api`, ja `vercel.json` ohjaa pyynnöt funktiolle. Cronit ajavat joka aamu (UTC) klo 3 päivittäisen kulutuksen ja klo 4 kynnystarkistuksen, joka lisää vähiin käyneet tuotteet ostoslistalle. Cron-reitit vaativat otsakkeen `Authorization: Bearer <CRON_SECRET>`, jonka Vercel lisää automaattisesti.

Tekoälyreitit voivat kestää kymmeniä sekunteja. Vercelin Hobby-tason funktioiden oletusaikaraja riittää siihen. Pyynnön runko saa olla enintään 4,5 Mt, joten selain pienentää kuvat ennen lähetystä.

## Paikallinen kehitys

```bash
# Backend: kopioi backend/.env.example → backend/.env ja täytä arvot
cd backend && npm install && PORT=3003 npm run start:dev

# Frontend: kopioi frontend/.env.example → frontend/.env.local
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Viten proxy ohjaa `/api/*` osoitteeseen `http://localhost:3003`. Testit ajetaan komennolla `npm test` kansioissa `backend` ja `frontend`.

Tietokantamuutokset tehdään uutena tiedostona kansioon `supabase/migrations/`, minkä jälkeen `supabase/schema.sql` päivitetään komennolla `bash scripts/build-schema.sh`.

## Lisenssi

MIT, katso [LICENSE](LICENSE).
