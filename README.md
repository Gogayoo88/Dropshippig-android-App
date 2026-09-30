# Comerț Studio
Prototip PWA pentru Android/iOS/Windows, publicat ca proiect separat pe Vercel. Nu cumpără, nu contactează furnizori, nu publică reclame și nu garantează venituri.

## Funcții disponibile
Coordonator cu o cerere și etape transparente; sugestii Google live cu etichete explicite; import Google Trends CSV; oferte introduse cu linkuri și costuri; calculator de contribuție; șabloane română/spaniolă; afiș PNG din fotografia utilizatorului; Shopify CSV draft; comenzi simulate; copie JSON locală.

## AI avansat
Endpoint `/api/director` este pregătit pentru Vercel AI Gateway, dar este dezactivat implicit. Configurează `AI_ENABLED=true`, `AI_MODEL` (un model ales din catalogul curent), `AI_GATEWAY_API_KEY` sau OIDC Vercel, și `STUDIO_ACCESS_TOKEN`. Activează doar după configurarea accesului și a bugetului. Cererile AI cer antet `x-studio-access`; interfața publică nu stochează cheia și nu are autentificare de utilizator încă. Nu se vând abonamente în acest prototip. Generarea AI de imagini nu este conectată; editorul local folosește fotografia reală.

## Teste
`npm test` — formule de marjă, export CSV, Trends, limite, coordonator, simulare. Nicio dependență externă necesară. Configurează Vercel outputDirectory `public`, API Node în `api` (incluse în vercel.json).

## Limite
Sugestiile nu măsoară vânzări și nu sunt clasament. Prețurile furnizorilor nu sunt verificate automat. Costurile folosesc EUR, fără conversii. TVA este model simplificat fără deducerea TVA din achiziții. Datele sunt locale; CSV Trends și fotografia se reîncarcă după reluare. Nu există magazin conectat, catalog AliExpress autorizat, autentificare SaaS, billing sau expediere reală. Nu folosi date personale reale în simulare.

## Versiunea 0.2: fișe reale de produs

Căutarea gratuită citește un index public Bing RSS și metadatele Product JSON-LD din paginile comercianților acceptați. Nu există contract SLA, catalog complet sau dovadă de vânzări. Unele pagini nu permit citirea fără autentificare ori nu au metadate; acestea apar ca indisponibile. Se poate solicita direct o pagină exactă prin API-ul `/api/product` (POST cu `url`). Nu se citește checkout-ul și nu se ghicește transportul gratuit.

Opțional: `SERPAPI_KEY` conectează căutarea Google Shopping. `PRODUCT_SEARCH_TOKEN` restricționează apelurile când este configurat, prin header-ul `x-studio-access`. Interfața de autentificare nu este încă implementată; nu configura un serviciu plătit pe un endpoint public fără protecție și limită de cost. Nu sunt configurate chei în arhiva livrată.

AliExpress/CJ/DSers nu sunt încă autorizate prin API. Prețul achiziției se introduce după verificarea variantei, cantității, țării și checkout-ului. Transportul 0 este permis numai după confirmare; transportul necunoscut rămâne lipsă. Prețul observat într-un magazin este reper comercial, nu cost de furnizor. Monedele nu sunt convertite implicit. Catalogul păstrează fotografia, descrierea, caracteristicile, prețul/range-ul și momentul citirii, în măsura în care sursa le publică. Numele de produs nu este înlocuit cu o sugestie Google. Categoriile de sezon predefinite sunt reguli editoriale, nu un clasament măsurat.

Calculul include costurile suplimentare de import introduse de utilizator. Livrarea necunoscută nu împiedică păstrarea ofertei, dar transportul necesar calculului nu poate fi lăsat gol. Exportul rămâne schiță, iar comenzile rămân simulări.
