# Home ERP

Kotitalouden ruokajärjestelmä: varasto, ostoslista, reseptit, ateriasuunnitelma, pakastin ja vakio-ostokset. Kun varaston tuote vähenee, se siirtyy ostoslistalle. Kun ostos merkitään ostetuksi, varasto päivittyy. Sovellus toimii puhelimessa kotinäytölle asennettavana web-sovelluksena (PWA), ja Claude voi käyttää sitä MCP-yhteyden kautta.

*A self-hosted household food ERP (pantry, shopping list, recipes, meal plans) for one household. The UI is in Finnish. One-click deploy to Vercel with a free Supabase database.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftomipienimaki-stack%2Fhome-erp-public&project-name=home-erp&repository-name=home-erp&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%2C%22protocol%22%3A%22storage%22%7D%5D)

## Asennus

Tarvitset GitHub-tunnuksen. Vercel- ja Supabase-tilit syntyvät asennuksen aikana, ja kotikäyttöön riittävät ilmaistasot.

1. **Paina yllä olevaa Deploy-nappia.** Vercel kopioi koodin GitHub-tiliisi ja ehdottaa Supabase-tietokannan luontia. Hyväksy se, valitse lähin alue (esim. Stockholm tai Frankfurt) ja paina **Deploy**. Build luo tietokannan taulut automaattisesti.
2. **Avaa sovellus ja luo tunnus.** Ensimmäisellä avauskerralla sovellus pyytää sähköpostin ja salasanan. Sen jälkeen uusia tunnuksia ei voi luoda.

Puhelimessa saat sovelluksen kotinäytölle selaimen jakovalikosta (**Lisää kotivalikkoon**).

**Jos Supabase-valintaa ei näkynyt** asennuksen aikana, sovellus kertoo, ettei tietokantaa ole kytketty. Avaa silloin projekti Vercelissä, valitse **Storage → Create Database → Supabase**, kytke se projektiin ja julkaise uudelleen (**Deployments → ⋯ → Redeploy**).

Jokainen asennus on oma, yhden kotitalouden palvelunsa. Tietosi ovat omassa Supabase-tietokannassasi, eikä kukaan muu näe niitä.

## Valinnaiset ominaisuudet

Lisää nämä Vercelissä kohdassa **Project → Settings → Environment Variables** ja julkaise uudelleen.

| Muuttuja | Mitä se avaa |
|---|---|
| `ANTHROPIC_API_KEY` | Reseptin tuonti kuvasta, ateriasuunnitelman generointi ja kauppojen suosikkilistojen tuonti. Avain saadaan osoitteesta [console.anthropic.com](https://console.anthropic.com). Ilman avainta muu sovellus toimii normaalisti. |
| `HOME_ERP_API_TOKEN` | Clauden MCP-yhteys (katso alla). Pitkä satunnainen merkkijono, esim. komennon `openssl rand -hex 32` tulos. |

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

## Asennus omaan Supabase-projektiin

Jos haluat käyttää olemassa olevaa Supabase-projektia ilman Vercelin integraatiota:

1. Aja [`supabase/schema.sql`](supabase/schema.sql) Supabasen SQL-editorissa (**SQL Editor → New query**).
2. Lisää Vercel-projektiin nämä muuttujat (**Project Settings → API** Supabasessa):

| Muuttuja | Arvo |
|---|---|
| `SUPABASE_URL` | Projektin URL, esim. `https://abcd1234.supabase.co` |
| `SUPABASE_ANON_KEY` | Julkinen anon- tai publishable-avain. Tämä päätyy selaimeen, ja se on tarkoitettu siihen. |
| `SUPABASE_SERVICE_ROLE_KEY` | Palvelu- tai secret-avain. Käytetään vain palvelimella. Älä jaa sitä kenellekään. |

Sovellus lukee myös Vercelin Supabase-integraation nimet (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` jne.). Jos asetat myös `POSTGRES_URL`-muuttujan, build ajaa uudet migraatiot automaattisesti. Valmiin käyttäjän voi ottaa omistajaksi asettamalla sen UID:n muuttujaan `SINGLE_USER_ID`.

## Tietoturva

- Rajapinta palvelee vain omistajaa (Supabase-tunnus, jonka tunniste on `SINGLE_USER_ID` tai oletustunniste) ja MCP-palvelinta (`HOME_ERP_API_TOKEN`).
- Tunnuksen luonti on auki vain siihen asti, kun omistaja on luotu. Luo tunnus heti asennuksen jälkeen.
- Supabase sallii oletuksena uusien käyttäjien rekisteröitymisen julkisella avaimella. Sellainen käyttäjä ei näe sinun tietojasi eikä pääse rajapintaan, mutta voit halutessasi estää rekisteröitymisen kokonaan: Supabasessa **Authentication → Sign In / Providers → Allow new users to sign up** pois.

## Rakenne

```
home-erp/
├── api/index.js   Vercel-funktio, joka ajaa backendin
├── backend/       NestJS-rajapinta (Supabasen palveluavaimella) ja migraatioskripti
├── frontend/      Vite + React + TypeScript + Tailwind, PWA
├── mcp/           MCP-palvelin Claudelle
├── supabase/      Migraatiot ja koottu schema.sql
└── vercel.json    Build ja reititys
```

Selain kutsuu rajapintaa polussa `/api`, ja `vercel.json` ohjaa pyynnöt funktiolle. Build ajaa ensin `backend/scripts/migrate.js`-skriptin, joka ajaa ajamattomat migraatiot ja kirjaa ne tauluun `home_erp_migrations`.

Päivittäiset ajot eivät tarvitse ajastinta: kun sovellusta käytetään uutena päivänä, se kirjaa varaston päivittäisen kulutuksen ja lisää vähiin käyneet tuotteet ostoslistalle. Ajot ovat idempotentteja, joten väliin jääneet päivät kirjataan kerralla. Jos haluat ajot tiettyyn kellonaikaan, reitit `/api/cron/daily-consumption` ja `/api/cron/daily-threshold-check` toimivat Vercel Cronin kanssa, kun asetat `CRON_SECRET`-muuttujan.

Tekoälyreitit voivat kestää kymmeniä sekunteja. Vercelin funktioiden oletusaikaraja riittää siihen. Pyynnön runko saa olla enintään 4,5 Mt, joten selain pienentää kuvat ennen lähetystä.

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
