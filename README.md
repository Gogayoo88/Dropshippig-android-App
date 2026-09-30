# Comerț Studio — căutare reală de produse

Proiect PWA pentru browser Android/iOS/Windows, pregătit pentru Vercel.

## Căutare independentă de magazin
GET /api/products?q=paraguas%20plegable&country=ES interoghează Shopify Global Catalog prin MCP. Nu cere conectarea unui magazin. Returnează variante comerciale, fotografii ale sursei, prețuri și moneda originală, descrieri și pagina comerciantului. Ordinea indică relevanța, nu numărul de vânzări.

Profilul UCP folosit implicit este exemplul public documentat de Shopify, pentru acest test. Variabila UCP_AGENT_PROFILE permite configurarea unui profil propriu. Accesul public a funcționat la verificarea din 30 septembrie 2026; disponibilitatea serviciului extern se poate schimba. Nu este necesară instalarea utilitarului UCP și nu trimitem identificatori de sesiune.

## Limite explicite
Catalogul conține oferte comerciale, nu confirmări de furnizori dropshipping. Prețurile observate nu sunt introduse automat drept costuri de aprovizionare. Transportul, taxele, cantitatea, dreptul de revânzare și condițiile de livrare se confirmă separat. Descrierile sintetizate de catalog sunt etichetate pentru confirmare. Serviciile AliExpress/CJ/BigBuy nu sunt conectate. Nu avem un clasament verificat de vânzări sau garanții de profit.

## Validare
npm test — 18 teste. Căutări efective pentru Spania: paraguas plegable, organizador armario, chaqueta invierno; fiecare a furnizat opt variante cu imagini și prețuri EUR. Publicarea și verificarea în browser sunt un pas separat de această verificare a sursei.

## Funcții suplimentare
Citirea paginilor comerciale acceptate: POST /api/product. Calculele financiare utilizează costurile confirmate introduse de utilizator. Export Shopify CSV ca produs draft. Datele locale se pot exporta/restaura. Directorul folosește reguli explicite, nu un model AI conectat. Generarea AI de fotografii, traducerea AI și publicarea automată pe rețele sociale nu sunt implementate.
