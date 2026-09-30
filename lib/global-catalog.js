const ENDPOINT='https://catalog.shopify.com/api/ucp/mcp';
const EXAMPLE='https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function money(p){if(!Number.isFinite(p?.amount)||!/^\w{3}$/.test(p?.currency??''))return null;const digits=new Intl.NumberFormat('en',{style:'currency',currency:p.currency}).resolvedOptions().maximumFractionDigits;return p.amount/10**digits;}
export function catalogProducts(data,checkedAt=new Date().toISOString()){
 return (data.products??[]).flatMap(p=>(p.variants??[]).map(v=>{
 const url=safeURL(v.url||p.url),image=safeURL((v.media??p.media??[]).find(m=>m.type==='image')?.url);if(!url)return null;
 const price=money(v.price),description=v.description?.plain||p.description?.plain||'';
 return {id:v.id||p.id,title:p.title||v.title||'Produs',description:description.slice(0,12000),image,url,sourceUrl:url,source:v.seller?.name||new URL(url).hostname,checkedAt,brand:'',sku:v.sku||'',gtin:'',category:(p.categories??[]).map(c=>c.value).join(' · '),attributes:(v.options??[]).map(o=>({name:o.name,value:o.label})),offers:price===null?[]:[{value:price,currency:v.price.currency,availability:v.availability?.available?'Disponibil declarat':'Stoc neconfirmat',url,seller:v.seller?.name||'',shipping:[]}],price,highPrice:null,currency:price===null?null:v.price.currency,availability:v.availability?.available?'Disponibil declarat':'Stoc neconfirmat',rating:p.rating?.value??null,reviewCount:p.rating?.count??null,variants:[{title:v.title,sku:v.sku}],evidence:'Shopify Global Catalog · variantă comercială',salesKnown:false,dropshippingConfirmed:false,notice:v.description?.plain?'Descriere și ofertă ale variantei comerciale din catalog. Verifică pagina originală înainte de cumpărare.':'Descriere sintetizată de catalog; caracteristicile trebuie confirmate pe pagina comerciantului.'};
 }).filter(Boolean)).slice(0,24);
}
export async function searchGlobalCatalog({q,country,language},fetcher=fetch){
 const body={jsonrpc:'2.0',method:'tools/call',id:1,params:{name:'search_catalog',arguments:{meta:{'ucp-agent':{profile:process.env.UCP_AGENT_PROFILE||EXAMPLE}},catalog:{query:q,context:{address_country:country,currency:country==='RO'?'RON':'EUR',language:language==='ro'?'ro-RO':'es-ES'},pagination:{limit:8}}}}};
 const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('Catalogul comercial răspunde HTTP '+response.status);
 const data=await response.json();if(data.error||data.result?.isError)throw Error('Catalogul nu a putut efectua căutarea.');const content=data.result?.structuredContent;if(!Array.isArray(content?.products))throw Error('Catalogul nu a furnizat o listă de produse verificabilă.');return content;
}
