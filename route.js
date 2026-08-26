export async function POST(req){
 const {worker,query}=await req.json();
 const prompts={
  productos:'Analiza categorías de productos, demanda, margen, competencia, logística y señales de tendencia.',
  proveedores:'Define cómo investigar proveedores, costes, plazos, devoluciones, reputación y envío a la UE.',
  competencia:'Crea un análisis de competencia: precio, oferta, diferenciación, anuncios y oportunidad.',
  marketing:'Crea ángulos de marketing, cliente ideal, oferta, contenido y pruebas publicitarias.',
  manager:'Actúa como manager: prioriza oportunidades, riesgos y próximos pasos.',
  secretaria:'Organiza la investigación en tareas, prioridades y checklist.'
 };
 const apiKey=process.env.OPENAI_API_KEY;
 if(!apiKey) return Response.json({result:`MODO DEMO\n\nTrabajador: ${worker}\nConsulta: ${query||'Sin consulta específica'}\n\n${prompts[worker]}\n\nPara obtener investigación AI real desde Internet, configura OPENAI_API_KEY en las variables de entorno de Vercel.`});
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({
   model:'gpt-5-mini',
   tools:[{type:'web_search_preview'}],
   input:`Eres un trabajador especializado de una aplicación de dropshipping. ${prompts[worker]} El usuario pide: ${query}. Responde en español, con datos verificables, enlaces/fuentes cuando estén disponibles y separa hechos de recomendaciones.`
  })});
  const d=await r.json();
  if(!r.ok) return Response.json({error:d?.error?.message||'Error de API'},{status:500});
  const text=(d.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').filter(Boolean).join('\n');
  return Response.json({result:text||'La API respondió sin texto.'});
 }catch(e){return Response.json({error:'Error conectando con el servicio de investigación.'},{status:500});}
}