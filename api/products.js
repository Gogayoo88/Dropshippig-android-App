import {searchGlobalCatalog,catalogProducts} from '../lib/global-catalog.js';
import {query} from './research.js';
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Numai GET'});}let p;try{p=query(req);}catch(e){return res.status(400).json({error:e.message});}const checkedAt=new Date().toISOString();
 try{
 const content=await searchGlobalCatalog(p);const catalog=catalogProducts(content,checkedAt);return res.status(200).json({...p,checkedAt,products:catalog,provider:'Shopify Global Catalog',issues:[],salesKnown:false,notice:'Oferte comerciale reale, cu variante și prețuri publicate. Ordinea este relevanța căutării, nu un clasament de vânzări. Transportul și condițiile dropshipping se verifică separat.'});

 }catch(e){return res.status(502).json({error:e.message||'Sursa produselor nu a răspuns',products:[],checkedAt});}}
