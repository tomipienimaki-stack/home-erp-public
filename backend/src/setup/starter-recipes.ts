import { CreateRecipeDto, RecipeIngredientInput } from '../recipes/dto';
import { IngredientTier, PantryCategory, PantryUnit } from '../common/types';

/**
 * Esimerkkireseptit, jotka lisätään uuteen asennukseen omistajan luonnin
 * yhteydessä (valinnainen). Tagi `esimerkki` erottaa ne omista resepteistä.
 * Raaka-aineilla on kategoria ja varastotaso, joten kauppalistan ja varaston
 * logiikka toimii heti.
 */
export const STARTER_TAG = 'esimerkki';

type Row = [name: string, quantity: number, unit: PantryUnit, category: PantryCategory, tier: IngredientTier, notes?: string];
const ing = (rows: Row[]): RecipeIngredientInput[] =>
  rows.map(([name, quantity, unit, category, tier, notes]) => ({ name, quantity, unit, category, tier, notes: notes ?? null }));

const KV = 'kasvikset_ja_hedelmat' as const;
const MA = 'maitotuotteet' as const;
const LK = 'lihat_ja_kala' as const;
const KU = 'kuivatuotteet' as const;
const SA = 'sailykkeet' as const;
const MO = 'mausteet_ja_oljyt' as const;
const PA = 'pakasteet' as const;

export const STARTER_RECIPES: CreateRecipeDto[] = [
  {
    name: 'Bataattisosekeitto',
    description:
      'Paahdettu bataatti-paprikasosekeitto ilman kermaa. Kasvikset paahdetaan uunissa ennen soseutusta, mikä karamellisoi bataatin ja paprikan ja syventää makua. Säilyy jääkaapissa 3–4 vrk ja kestää pakastamisen.',
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 40,
    meal_type: 'paivallinen',
    tags: ['kasvis', 'keitto', 'uuni', 'maidoton'],
    instructions: `1. Kuumenna uuni 220 asteeseen. Kuutioi bataatti noin 2 cm paloiksi, lohko paprikat ja sipuli.
2. Pyöritä kasvikset 2 rkl:ssa oliiviöljyä ja suolassa. Levitä pellille yhteen kerrokseen, sillä liian täysi pelti höyryttää eikä ruskista.
3. Paahda 25–30 minuuttia, kunnes reunat ovat ruskistuneet ja bataatti on pehmeää.
4. Kuullota valkosipulia kattilassa tilkassa öljyä noin 1 minuutti keskilämmöllä.
5. Lisää paahdetut kasvikset ja 8 dl kasvislientä, ja keitä 5 minuuttia.
6. Soseuta sileäksi. Lisää 1 rkl sitruunamehua, kuumenna kiehumispisteeseen ja tarkista suola.

Vinkit: Lisää sitruunamehu vähitellen ja maista välissä. Ohenna tarvittaessa liemellä 0,5 dl kerrallaan. Kermaversio: 2 dl ruokakermaa soseutuksen jälkeen. Kookosversio: 2 dl kookosmaitoa, 2 cm tuoretta inkivääriä ja limen mehu sitruunan tilalle. Pinnalle paahdettuja kurpitsansiemeniä.`,
    ingredients: ing([
      ['Bataatti', 700, 'g', KV, 'tuore', '2 keskikokoista'],
      ['Paprika', 2, 'kpl', KV, 'tuore', 'punainen'],
      ['Sipuli', 1, 'kpl', KV, 'tarkistettava'],
      ['Valkosipuli', 2, 'kpl', KV, 'tarkistettava', 'kynttä'],
      ['Oliiviöljy', 27, 'g', MO, 'perus', '2 rkl'],
      ['Kasvisliemikuutio', 2, 'kpl', KU, 'perus', '8 dl lientä'],
      ['Sitruuna', 1, 'kpl', KV, 'tuore', '1 rkl mehua'],
      ['Suola', 1, 'kpl', MO, 'perus', 'noin 1 tl'],
      ['Mustapippuri', 1, 'kpl', MO, 'perus', 'maun mukaan'],
    ]),
  },
  {
    name: 'Couscous-salaatti',
    description: 'Raikas lisäke tai kevyt pääruoka. Sopii esimerkiksi halloumi-vihannesvartaiden kanssa.',
    servings: 2,
    prep_time_min: 15,
    meal_type: 'paivallinen',
    tags: ['kasvis', 'salaatti', 'lisäke', 'nopea'],
    instructions: `1. Kaada kiehuva vesi (2 dl) couscousin päälle, lisää suola ja tilkka oliiviöljyä. Peitä ja anna seistä 5 min. Kuohkeuta haarukalla.
2. Kuutioi kurkku, puolita kirsikkatomaatit, hienonna punasipuli, minttu ja persilja.
3. Sekoita couscousiin vihannekset, yrtit, sitruunankuori ja -mehu (2–3 rkl), oliiviöljy 3 rkl, suola ja pippuri.
4. Paahda pinjansiemenet kuivalla pannulla.
5. Lisää feta ja paahdetut pinjansiemenet päälle vasta tarjoillessa, ei sekaan etukäteen.`,
    ingredients: ing([
      ['Couscous', 200, 'g', KU, 'sailyva'],
      ['Kurkku', 0.5, 'kpl', KV, 'tuore'],
      ['Kirsikkatomaatit', 200, 'g', KV, 'tuore'],
      ['Punasipuli', 0.5, 'kpl', KV, 'tarkistettava'],
      ['Minttu', 1, 'pkt', KV, 'tuore', '3 rkl hienonnettuna'],
      ['Persilja', 1, 'pkt', KV, 'tuore', '3 rkl hienonnettuna'],
      ['Sitruuna', 1, 'kpl', KV, 'tuore', 'kuori ja 2–3 rkl mehua'],
      ['Oliiviöljy', 0.45, 'dl', MO, 'perus', '3 rkl + tilkka couscousiin'],
      ['Feta', 150, 'g', MA, 'tuore'],
      ['Pinjansiemenet', 30, 'g', KU, 'sailyva'],
      ['Suola', 1, 'kpl', MO, 'perus'],
      ['Mustapippuri', 1, 'kpl', MO, 'perus'],
    ]),
  },
  {
    name: 'Broileri-pestokiusaus',
    description: 'Helppo arkivuoka pakasteperuna-sipulisekoituksesta. Valmistuu uunissa puolessa tunnissa.',
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 30,
    meal_type: 'paivallinen',
    tags: ['kana', 'uuni', 'vuoka', 'arki'],
    instructions: `1. Kaada peruna-sipulisekoitus uunivuokaan ja anna sulaa hetki. Kuumenna uuni 200–225 asteeseen.
2. Kuumenna tilkka öljyä pannulla. Paista broilerisuikaleet ja mausta suolalla ja italialaisella yrttimausteella.
3. Sekoita broilerisuikaleet, vihreä pesto ja kevätsipuli peruna-sipulisekoituksen joukkoon. Kuutioi sekaan myös tomaatit.
4. Kaada päälle ruokakerma ja ripottele pinnalle juustoraaste.
5. Kypsennä uunissa noin 30 minuuttia.

Vinkit: reilusti valkosipulia ja suolaa. Mausteiksi sopivat basilika, timjami, cayennepippuri ja mustapippuri. Kevätsipulin voi korvata 1–2 tavallisella sipulilla.`,
    ingredients: ing([
      ['Perunasipulisekoitus', 500, 'g', PA, 'sailyva', 'pakaste'],
      ['Broilerin suikaleet', 300, 'g', LK, 'tuore'],
      ['Vihreä pesto', 100, 'g', SA, 'sailyva'],
      ['Kevätsipuli', 2, 'kpl', KV, 'tuore'],
      ['Tomaatti', 3, 'kpl', KV, 'tuore'],
      ['Ruokakerma', 2, 'dl', MA, 'tuore'],
      ['Juustoraaste', 125, 'g', MA, 'tarkistettava'],
      ['Öljy', 15, 'g', MO, 'perus', '1 rkl'],
      ['Italialainen yrttimauste', 1, 'kpl', MO, 'perus'],
      ['Suola', 1, 'kpl', MO, 'perus'],
    ]),
  },
  {
    name: 'Jauheliha-dauphinoise',
    description:
      'Valkosipulikermaperunat jauhelihalla. Perunat haudutetaan ensin kermassa, jolloin kastike sakeutuu samettiseksi.',
    servings: 6,
    prep_time_min: 30,
    cook_time_min: 60,
    meal_type: 'paivallinen',
    tags: ['jauheliha', 'uuni', 'peruna', 'arki'],
    instructions: `1. Kuori ja viipaloi perunat 2–3 mm paksuiksi, mieluiten mandoliinilla. Älä huuhtele, sillä tärkkelys sakeuttaa kastikkeen.

2. Kaada ruokakerma ja maito leveään kattilaan (vähintään 4 l). Lisää 4 murskattua valkosipulinkynttä, 3 tl suolaa, reilusti pippuria ja hyppysellinen muskottipähkinää. Kuumenna kiehumispisteen tuntumaan.

3. Lisää perunat ja hauduta miedolla lämmöllä 8–10 min. Sekoita lastalla pohjasta parin minuutin välein, sillä tärkkelys tarttuu helposti pohjaan. Perunat ovat valmiita, kun ne taipuvat mutta ovat keskeltä vielä raakoja ja kerma on sakeutunut. Maista: kerman pitää maistua hieman liian suolaiselta.

4. Sillä välin kuumenna paksupohjainen pannu ja ruskista jauheliha kahdessa erässä. Älä sekoita ensimmäiseen 2–3 minuuttiin, jotta pintaan tulee paistopinta. Lisää lopuksi hienonnettu sipuli, loput valkosipulista hienonnettuna, timjami, soija, ½ tl suolaa ja pippuri.

5. Kuumenna uuni 175 asteeseen. Nosta puolet perunoista kermoineen noin 25 × 35 cm:n vuokaan, levitä jauheliha päälle ja kaada loput perunat ja kerma pinnalle. Painele pintaa niin, että neste juuri peittää perunat.

6. Paista folion alla 30 min, poista folio ja jatka 25–30 min, kunnes pinta on ruskea ja veitsi uppoaa perunaan vastuksetta. Halutessasi ripottele viimeiseksi 15 minuutiksi pinnalle raastettua parmesaania.

7. Anna seistä 15 min ennen tarjoilua, jotta kastike asettuu.`,
    ingredients: ing([
      ['Peruna', 1.5, 'kg', KV, 'tarkistettava', 'yleisperuna'],
      ['Naudan jauheliha', 700, 'g', LK, 'tuore'],
      ['Ruokakerma', 7, 'dl', MA, 'tuore'],
      ['Maito', 3, 'dl', MA, 'tuore', 'täysmaito'],
      ['Valkosipuli', 1, 'kpl', KV, 'tarkistettava', 'iso; 4 kynttä kermaan, loput lihaan'],
      ['Sipuli', 1, 'kpl', KV, 'tarkistettava'],
      ['Timjami', 1, 'kpl', MO, 'perus', '1 tl kuivattua'],
      ['Soijakastike', 1, 'kpl', MO, 'perus', '1 tl'],
      ['Muskottipähkinä', 1, 'kpl', MO, 'perus', 'hyppysellinen'],
      ['Suola', 1, 'kpl', MO, 'perus', '3 tl kermaan, ½ tl lihaan'],
      ['Mustapippuri', 1, 'kpl', MO, 'perus', 'reilusti'],
    ]),
  },
  {
    name: 'Kasvis-fetapiirakka',
    description: 'Kaurapohjainen piirakka parsakaalilla, tomaateilla, fetalla ja oliiveilla.',
    servings: 8,
    prep_time_min: 20,
    cook_time_min: 40,
    meal_type: 'paivallinen',
    tags: ['kasvis', 'uuni', 'piirakka'],
    instructions: `1. Kuumenna uuni 225 asteeseen. Sekoita keskenään vehnäjauhot, kaurahiutaleet ja leivinjauhe. Sekoita joukkoon pehmeä margariini ja lisää kylmä vesi. Sekoita taikina tasaiseksi.
2. Painele taikina piirakkavuoan pohjalle ja reunoille. Esipaista pohjaa uunin alimmalla tasolla noin 10 minuuttia.
3. Levitä pohjalle suurin osa paloitelluista kirsikkatomaateista, parsakaalista, fetakuutioista ja oliiveista.
4. Vatkaa kulhossa munat, tuorejuusto, ranskankerma ja pippuri. Kaada seos täytteen päälle ja ripottele pinnalle loput täytteet.
5. Paista 225 asteessa 30–40 minuuttia, kunnes täyte on hyytynyt ja pinta saanut väriä. Koristele tuoreella basilikalla.`,
    ingredients: ing([
      ['Vehnäjauho', 2, 'dl', KU, 'perus'],
      ['Kaurahiutaleet', 1, 'dl', KU, 'sailyva'],
      ['Leivinjauhe', 5, 'g', KU, 'perus', '1 tl'],
      ['Margariini', 100, 'g', MA, 'sailyva'],
      ['Kirsikkatomaatit', 250, 'g', KV, 'tuore'],
      ['Parsakaali', 200, 'g', KV, 'tuore'],
      ['Feta', 200, 'g', MA, 'tuore'],
      ['Kalamataoliivit', 1, 'dl', SA, 'sailyva'],
      ['Kananmuna', 2, 'kpl', MA, 'tarkistettava'],
      ['Maustamaton tuorejuusto', 200, 'g', MA, 'tuore'],
      ['Ranskankerma', 200, 'g', MA, 'tuore'],
      ['Mustapippuri', 1, 'kpl', MO, 'perus', '½ tl'],
      ['Tuore basilika', 1, 'kpl', KV, 'tuore', 'koristeluun'],
    ]),
  },
  {
    name: 'Punainen pestopasta',
    description:
      'Kastiketta ei kypsennetä, vaan kaikki sekoitetaan kuuman pastan kanssa kulhossa. Pastavesi sitoo kastikkeen pastan pintaan, ja sitruuna raikastaa.',
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 15,
    meal_type: 'paivallinen',
    tags: ['kasvis', 'pasta', 'nopea'],
    instructions: `1. Paahda paprika air fryerissa tai uunissa 200 asteessa noin 15 minuuttia, kunnes kuori tummuu. Anna hautua hetki kulhossa kannen alla, kuori ja suikaloi. Pikavaihtoehto: purkkiin säilötty grillattu paprika.
2. Pistä pastavesi kiehumaan ja suolaa reilusti.
3. Paahda auringonkukansiemenet kuivalla pannulla keskilämmöllä 3–4 min, kunnes ne ovat kullanruskeita ja tuoksuvat. Lisää hyppysellinen suolaa ja siirrä sivuun.
4. Puolita aurinkokuivatut tomaatit ja ota purkin öljy talteen. Puolita oliivit. Kuutioi kaksi kolmasosaa fetasta ja murenna loput.
5. Sekoita isossa tarjoilukulhossa pesto, 2–3 rkl tomaattien öljyä, raastettu valkosipuli, puolikkaan sitruunan raastettu kuori ja 1 rkl sitruunamehua.
6. Keitä pasta al denteksi. Ota ennen valutusta talteen noin 2 dl keitinvettä.
7. Sekoita kulhon kastikkeeseen noin 1 dl kuumaa keitinvettä. Kaada kuuma valutettu pasta kulhoon ja sekoita voimakkaasti noin 30 sekuntia, kunnes kastike tarttuu pastan pintaan kiiltävänä. Lisää vettä tilkka kerrallaan, jos seos on tahmea.
8. Sekoita joukkoon murennettu feta, tomaatit, oliivit ja paprika. Murennettu feta sulaa kuuman pastan kanssa kermaiseksi sidokseksi.
9. Tarkista suola ja sitruuna. Lisää päälle fetakuutiot, paahdetut siemenet ja basilika vasta juuri ennen tarjoilua, jotta siemenet pysyvät rapeina.

Proteiiniversio: kanan sisäfileet air fryerissa 200 asteessa 8–10 min (sisälämpö 72 °C), lepo 5 min, siivuina päälle.
Sopii myös huoneenlämpöisenä seuraavana päivänä. Lisää silloin tilkka sitruunaa ja siemenet vasta tarjoillessa.`,
    ingredients: ing([
      ['Lyhyt pasta', 400, 'g', KU, 'perus', 'esim. rigatoni tai casarecce'],
      ['Punainen pesto', 1, 'prk', SA, 'sailyva'],
      ['Aurinkokuivatut tomaatit', 1, 'prk', SA, 'sailyva', 'öljy talteen kastikkeeseen'],
      ['Mustat oliivit', 1, 'prk', SA, 'sailyva'],
      ['Feta', 1, 'pkt', MA, 'tuore', '1/3 murennettuna, loput kuutioina'],
      ['Paprika', 1, 'kpl', KV, 'tuore', 'tai purkkipaprika'],
      ['Auringonkukansiemenet', 1, 'dl', KU, 'sailyva', 'paahdetaan'],
      ['Sitruuna', 1, 'kpl', KV, 'tuore', 'kuori ja mehu'],
      ['Valkosipuli', 1, 'kpl', KV, 'tarkistettava', 'kynsi, hienoksi raastettuna'],
      ['Tuore basilika', 1, 'kpl', KV, 'tuore', 'koristeluun'],
    ]),
  },
  {
    name: 'Ragù alla bolognese (iso satsi)',
    description:
      'Iso satsi pakastukseen, 10–12 annosta. Ilman viiniä. Tarjoile leveän nauhapastan ja parmesaanin kanssa. Pakasta ilman pastaa 300–400 g litteinä pusseina.',
    servings: 11,
    prep_time_min: 60,
    cook_time_min: 180,
    meal_type: 'paivallinen',
    tags: ['jauheliha', 'pastakastike', 'italialainen', 'batch'],
    instructions: `1. Kuutioi sipuli, porkkana ja selleri hyvin pieneksi (noin 3 mm). Hieno soffritto sulaa kastikkeeseen.
2. Kuullota pekoni paksupohjaisessa padassa miedolla lämmöllä, kunnes rasva sulaa. Lisää soffritto ja noin ½ tl suolaa ja hauduta 15 min miedolla lämmöllä pehmeäksi, ei ruskeaksi. Nosta pois.
3. Ruskista jauheliha kolmessa erässä kovalla lämmöllä. Älä koske 4 minuuttiin, käännä kun pohja on ruskea. Suolaa kukin erä ruskistuksen jälkeen, noin 1 tl/erä (puolet, jos käytät liemikuutioita).
4. Palauta kaikki pataan. Lisää maito ja muskotti ja keitä, kunnes maito on lähes haihtunut (noin 15 min). Maito lisätään ennen tomaattia, muuten se juoksettuu.
5. Lisää tomaattipyree ja paista minuutti. Lisää tomaattimurska, liemi ja laakerinlehdet.
6. Kansi raolleen ja uuniin 140 asteeseen kolmeksi tunniksi. Nesteen pitää juuri ja juuri poreilla. Sekoita kerran tunnissa.
7. Loppusuolaa vasta nyt, noin 1–2 tl maistellen. Lisää tarvittaessa tilkka sitruunamehua. Kastike on valmis, kun rasva on erottunut oranssina kalvona pinnalle ja liha on täysin pehmeää.

Pakastus: jäähdytä nopeasti laakeassa vuoassa ja pakasta 300–400 g erinä litteissä pusseissa. Laatu säilyy noin 3 kk.`,
    ingredients: ing([
      ['Naudan jauheliha', 1, 'kg', LK, 'tuore', '17 %'],
      ['Sian jauheliha', 1, 'kg', LK, 'tuore'],
      ['Pekoni', 150, 'g', LK, 'tuore', 'tai pancetta, valinnainen'],
      ['Sipuli', 2, 'kpl', KV, 'tarkistettava', 'iso'],
      ['Porkkana', 3, 'kpl', KV, 'tarkistettava'],
      ['Sellerin varsi', 3, 'kpl', KV, 'tuore'],
      ['Tomaattimurska', 3, 'tlk', SA, 'sailyva', '3 × 400 g'],
      ['Tomaattipyree', 1, 'pkt', SA, 'sailyva', 'tuubi, noin 2 rkl'],
      ['Lihaliemi', 5, 'dl', MO, 'perus', 'tai kanaliemi'],
      ['Maito', 4, 'dl', MA, 'tuore'],
      ['Laakerinlehti', 2, 'kpl', MO, 'perus'],
      ['Muskottipähkinä', 1, 'kpl', MO, 'perus', 'noin ¼ tl'],
      ['Suola', 1, 'kpl', MO, 'perus', 'yhteensä noin 4–5 tl vaiheittain'],
    ]),
  },
  {
    name: 'Tom yam -keitto',
    description: 'Nopea ja tulinen kookoskeitto kanalla ja nuudeleilla.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 20,
    meal_type: 'paivallinen',
    tags: ['kana', 'keitto', 'aasialainen', 'nopea'],
    instructions: `1. Paista kanasuikaleita hetki kattilassa tilkassa öljyä, älä anna ruskistua. Lisää silputtu sipuli.
2. Lisää tom yam -tahna ja noin 1 dl kookosmaitoa. Kypsennä kanasuikaleet valmiiksi.
3. Lisää loput kookosmaidosta, vesi ja murennettu kanaliemikuutio. Purista sekaan sitruunan mehu (lime käy myös).
4. Lisää pilkottu paprika ja anna kiehua hetki.
5. Lisää nuudelit ja keitä, kunnes ne ovat kypsiä. Tarjoa heti.`,
    ingredients: ing([
      ['Broilerin suikaleet', 350, 'g', LK, 'tuore', 'esim. hunajamarinoidut'],
      ['Sipuli', 1, 'kpl', KV, 'tarkistettava'],
      ['Paprika', 1, 'kpl', KV, 'tuore'],
      ['Tom yam -tahna', 1, 'prk', MO, 'sailyva', 'noin 1/3 purkkia'],
      ['Kookosmaito', 4, 'dl', SA, 'sailyva'],
      ['Vesi', 3, 'dl', 'muu', 'perus'],
      ['Kanaliemikuutio', 1, 'kpl', KU, 'perus'],
      ['Sitruuna', 1, 'kpl', KV, 'tuore', 'tai lime'],
      ['Nuudelit', 2, 'kpl', KU, 'sailyva', 'annosta'],
    ]),
  },
];

export function withStarterTag(recipe: CreateRecipeDto): CreateRecipeDto {
  return { ...recipe, tags: [...(recipe.tags ?? []), STARTER_TAG] };
}
