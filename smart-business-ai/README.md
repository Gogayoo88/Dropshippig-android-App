# Smart Business AI — n8n motor

Motorul de automatizare pentru magazine, saloane, restaurante și alte firme.

## Scop
- un singur n8n central;
- fiecare firmă separată prin business_id;
- stări: trial, active, grace, suspended, manual_off, cancelled;
- program, servicii, prețuri, rezervări, conversații și handoff;
- panoul mobil rămâne separat de n8n.

## Hosting demo
Render Free + Render Postgres pentru probă. Free Web Service poate adormi după inactivitate, deci nu este producție 24/7.

## Producție
Migrare ulterioară pe VM persistentă (de exemplu Oracle Always Free, dacă este disponibil pe cont).
