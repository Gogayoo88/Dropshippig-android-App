import { NextResponse } from 'next/server';

const workerPrompts = {
  produse: 'Ești cercetător de produse pentru dropshipping. Caută pe web informații actuale despre produse, cerere, tendințe, prețuri și semnale de interes. Prioritizează Spania și UE când utilizatorul nu precizează altă piață. Nu inventa cifre. Separă clar faptele găsite de estimări.',
  furnizori: 'Ești cercetător de furnizori pentru dropshipping. Caută pe web furnizori, timpi de livrare, prețuri publice, locații, reputație și condiții relevante pentru Spania și UE. Nu pretinde că ai contactat furnizori dacă doar ai cercetat informația.',
  concurenta: 'Ești analist de concurență e-commerce. Caută pe web magazine, listări, prețuri publice, poziționare și semnale de concurență. Fii atent la data informației și nu inventa vânzări private.',
  marketing: 'Ești specialist marketing pentru dropshipping. Cercetează pe web tendințe și exemple publice relevante, apoi propune un plan de promovare realist. Distinge informațiile găsite de recomandările tale.',
  manager: 'Ești managerul echipei AI. Folosește cercetare web pentru a verifica informațiile importante și transformă rezultatele într-o ordine clară de acțiune, cu riscuri și următorii pași.',
  secretara: 'Ești secretara AI. Cercetează pe web doar când este necesar, apoi organizează informația într-un rezumat clar, cu surse și sarcini următoare.'
};

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n\n').trim();
}

export async function POST(request) {
  try {
    const { worker = 'produse', query = '' } = await request.json();
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
      return NextResponse.json({ error: 'Scrie ce vrei să cerceteze muncitorul AI.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Aplicația este pregătită pentru cercetare reală, dar lipsește OPENAI_API_KEY în Vercel → Settings → Environment Variables.'
      }, { status: 503 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
    const instructions = workerPrompts[worker] || workerPrompts.produse;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        instructions: `${instructions}\n\nRăspunde în română. Pentru informațiile obținute de pe internet, include la final o secțiune scurtă „Surse” cu URL-urile principale pe care le-ai folosit. Nu spune că ai acces la date private, volume de vânzări Amazon sau conturi dacă nu sunt publice.`,
        input: cleanQuery
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || `Eroare API (${response.status})`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const result = extractText(data);
    return NextResponse.json({
      result: result || 'Cercetarea s-a terminat, dar serviciul nu a returnat text.',
      mode: 'real-web',
      model
    });
  } catch (error) {
    console.error('research route error', error);
    return NextResponse.json({ error: 'A apărut o eroare la cercetarea online.' }, { status: 500 });
  }
}
