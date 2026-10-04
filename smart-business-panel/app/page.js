'use client';
import {useEffect,useMemo,useState} from 'react';

const blankBusiness={
  business_id:'demo_salon_001',name:'Peluquería Demo',type:'Peluquería',phone:'+34 ',email:'',website:'',
  timezone:'Europe/Madrid',address:'',languages:'Español, Română',
  schedule:'Luni-Vineri 09:00-19:00\nSâmbătă 09:00-14:00\nDuminică închis',
  services:[
    {name:'Tuns',price:'15 €'},
    {name:'Barbă',price:'8 €'},
    {name:'Tuns + barbă',price:'20 €'}
  ],
  status:'trial',trialHours:24,trialStartedAt:Date.now(),agent_enabled:true
};
const blankCustomer={name:'',phone:'',email:'',notes:'',lastVisit:'',preferredLanguage:'Español'};
const fmtLeft=(b)=>{
  if(b.status!=='trial') return null;
  const end=b.trialStartedAt+b.trialHours*3600000;
  const ms=Math.max(0,end-Date.now());
  if(ms<=0)return 'EXPIRAT';
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
  return h+'h '+m+'m';
};

function detectLang(msg){
  const q=msg.toLowerCase();
  if(/[¿¡]|\b(hola|precio|cuánto|cuanto|horario|cita|reserva|abierto|cerrado|dónde|donde)\b/.test(q)) return 'es';
  if(/\b(hello|price|appointment|booking|open|closed|where|service)\b/.test(q)) return 'en';
  return 'ro';
}
function phrase(lang,key){
  const t={
    ro:{askService:'Spuneți-mi serviciul dorit și vă dau prețul confirmat din fișa firmei.',addressMissing:'Adresa nu este încă introdusă în fișa firmei.',booking:'Pot înregistra o cerere de rezervare. Alegeți data, ora și serviciul.',unknown:'Nu am informația confirmată în fișa firmei. Pot transmite întrebarea către firmă.',wantBooking:'Doriți și o programare?'},
    es:{askService:'Dígame qué servicio desea y le indico el precio confirmado en la ficha del negocio.',addressMissing:'La dirección todavía no está registrada en la ficha del negocio.',booking:'Puedo registrar una solicitud de reserva. Indique fecha, hora y servicio.',unknown:'No tengo esa información confirmada en la ficha del negocio. Puedo enviar la pregunta al negocio.',wantBooking:'¿Quiere que compruebe también una cita?'},
    en:{askService:'Tell me which service you want and I will give you the confirmed price from the business profile.',addressMissing:'The address has not been added to the business profile yet.',booking:'I can register a booking request. Choose the date, time and service.',unknown:'I do not have that information confirmed in the business profile. I can forward the question to the business.',wantBooking:'Would you like me to check an appointment too?'}
  };
  return t[lang]?.[key]||t.ro[key];
}
function answer(b,msg){
  const q=msg.toLowerCase().trim();
  const lang=detectLang(msg);
  const service=b.services.find(s=>q.includes(s.name.toLowerCase()));
  if(/preț|pret|cât cost|cat cost|precio|cuánto cuesta|cuanto cuesta/.test(q)){
    if(service)return `${service.name}: ${service.price}. ${phrase(lang,'wantBooking')}`;
    return phrase(lang,'askService');
  }
  if(/program|orar|deschis|închis|abierto|cerrado|horario/.test(q))return b.schedule;
  if(/adres|unde|direc|dónde|donde|where/.test(q))return b.address||phrase(lang,'addressMissing');
  if(/programare|rezerv|cita|reserva|appointment|booking/.test(q))return phrase(lang,'booking');
  if(/servici|servicio|ofert/.test(q))return b.services.map(s=>`${s.name} — ${s.price}`).join('\n');
  return phrase(lang,'unknown');
}

export default function Home(){
  const [business,setBusiness]=useState(blankBusiness);
  const [customer,setCustomer]=useState(blankCustomer);
  const [services,setServices]=useState(blankBusiness.services);
  const [chat,setChat]=useState([]);
  const [msg,setMsg]=useState('');
  const [reservations,setReservations]=useState([]);
  const [booking,setBooking]=useState({date:'',time:'',service:'Tuns'});
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    const raw=localStorage.getItem('smart-business-demo');
    if(raw){try{const x=JSON.parse(raw);setBusiness(x.business||blankBusiness);setCustomer(x.customer||blankCustomer);setServices(x.services||blankBusiness.services);setReservations(x.reservations||[]);setChat(x.chat||[])}catch{}}
  },[]);
  useEffect(()=>{
    const b={...business,services};
    localStorage.setItem('smart-business-demo',JSON.stringify({business:b,customer,services,reservations,chat}));
  },[business,customer,services,reservations,chat]);

  const trialLeft=useMemo(()=>fmtLeft(business),[business,saved]);
  useEffect(()=>{
    const id=setInterval(()=>setSaved(x=>!x),60000);
    return()=>clearInterval(id);
  },[]);

  const effectiveStatus=business.status==='trial'&&trialLeft==='EXPIRAT'?'suspended':business.status;
  const canReply=business.agent_enabled&&['trial','active','grace'].includes(effectiveStatus);

  function send(){
    if(!msg.trim())return;
    const user={by:'Client',text:msg,time:new Date().toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})};
    let botText;
    if(!canReply)botText='Agentul este suspendat pentru această firmă.';
    else botText=answer({...business,services},msg);
    setChat(c=>[...c,user,{by:'Robot',text:botText,time:new Date().toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})}]);
    setMsg('');
  }
  function addService(){setServices(s=>[...s,{name:'Serviciu nou',price:'0 €'}])}
  function addBooking(){
    if(!booking.date||!booking.time)return;
    setReservations(r=>[...r,{...booking,customer:customer.name||'Client test',phone:customer.phone,status:'cerere'}]);
  }
  function startTrial(hours){setBusiness(b=>({...b,status:'trial',trialHours:hours,trialStartedAt:Date.now(),agent_enabled:true}))}

  return <main>
    <header>
      <div><h1>SMART BUSINESS <span>AI</span></h1><p>Automatizare pentru restaurante, saloane, magazine și servicii</p></div>
      <div className={'badge '+effectiveStatus}>{effectiveStatus.toUpperCase()}</div>
    </header>

    <div className="notice"><b>MOD TEST:</b> panoul funcționează acum local în browser. Când n8n este online, același panou va trimite mesajele către webhook-ul real.</div>

    <section className="grid two">
      <div className="card">
        <h2>Fișa firmei</h2>
        <label>Nume firmă<input value={business.name} onChange={e=>setBusiness({...business,name:e.target.value})}/></label>
        <label>Tip afacere<input value={business.type} onChange={e=>setBusiness({...business,type:e.target.value})}/></label>
        <label>Telefon firmă<input value={business.phone} onChange={e=>setBusiness({...business,phone:e.target.value})}/></label>
        <label>Email firmă<input type="email" value={business.email||''} onChange={e=>setBusiness({...business,email:e.target.value})}/></label>
        <label>Site web<input value={business.website||''} onChange={e=>setBusiness({...business,website:e.target.value})}/></label>
        <label>Adresă<input value={business.address} onChange={e=>setBusiness({...business,address:e.target.value})}/></label>
        <label>Program<textarea value={business.schedule} onChange={e=>setBusiness({...business,schedule:e.target.value})}/></label>
        <div className="row">
          <button onClick={()=>startTrial(12)}>Trial 12h</button>
          <button onClick={()=>startTrial(24)}>Trial 24h</button>
          <button onClick={()=>startTrial(72)}>Trial 3 zile</button>
        </div>
        <div className="statusline"><span>Trial rămas</span><b>{trialLeft||'—'}</b></div>
        <div className="row">
          <button className="ok" onClick={()=>setBusiness({...business,status:'active',agent_enabled:true})}>ACTIVEAZĂ</button>
          <button className="danger" onClick={()=>setBusiness({...business,status:'suspended',agent_enabled:false})}>SUSPENDĂ</button>
        </div>
      </div>

      <div className="card">
        <h2>Fișa clientului</h2>
        <label>Nume<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></label>
        <label>Telefon<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label>
        <label>Email<input value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/></label>
        <label>Limba<input value={customer.preferredLanguage} onChange={e=>setCustomer({...customer,preferredLanguage:e.target.value})}/></label>
        <label>Note<textarea value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})}/></label>
        <div className="statusline"><span>Agent</span><b>{canReply?'PORNIT':'OPRIT'}</b></div>
      </div>
    </section>

    <section className="card">
      <div className="titleRow"><h2>Servicii și prețuri</h2><button onClick={addService}>+ Serviciu</button></div>
      <div className="services">
        {services.map((s,i)=><div className="service" key={i}>
          <input value={s.name} onChange={e=>setServices(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
          <input value={s.price} onChange={e=>setServices(v=>v.map((x,j)=>j===i?{...x,price:e.target.value}:x))}/>
          <button className="danger small" onClick={()=>setServices(v=>v.filter((_,j)=>j!==i))}>×</button>
        </div>)}
      </div>
    </section>

    <section className="grid two">
      <div className="card">
        <h2>Rezervări</h2>
        <div className="booking">
          <input type="date" value={booking.date} onChange={e=>setBooking({...booking,date:e.target.value})}/>
          <input type="time" value={booking.time} onChange={e=>setBooking({...booking,time:e.target.value})}/>
          <select value={booking.service} onChange={e=>setBooking({...booking,service:e.target.value})}>{services.map((s,i)=><option key={i}>{s.name}</option>)}</select>
          <button className="ok" onClick={addBooking}>Adaugă</button>
        </div>
        <div className="list">{reservations.length===0?<p>Nicio rezervare încă.</p>:reservations.map((r,i)=><div className="item" key={i}><b>{r.date} {r.time}</b><span>{r.service} · {r.customer}</span></div>)}</div>
      </div>

      <div className="card chat">
        <h2>Testează robotul</h2>
        <div className="chatbox">{chat.length===0?<p className="muted">Exemplu: „Cât costă tunsul?” sau „Aveți deschis sâmbătă?”</p>:chat.map((m,i)=><div key={i} className={'bubble '+(m.by==='Robot'?'bot':'user')}><b>{m.by}</b><span>{m.text}</span><small>{m.time}</small></div>)}</div>
        <div className="send"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Scrie un mesaj de test..."/><button onClick={send}>Trimite</button></div>
      </div>
    </section>

    <section className="card channels">
      <h2>Canale și automatizări</h2>
      <div className="channel"><div><b>WhatsApp Business</b><p>Conectare oficială Meta; robotul citește și răspunde după autorizarea numărului firmei.</p></div><span className="pending">DE CONECTAT</span></div>
      <div className="channel"><div><b>Email</b><p>Gmail / Outlook / IMAP cu autorizare; răspunsuri automate sau propuneri pentru aprobare.</p></div><span className="pending">DE CONECTAT</span></div>
      <div className="channel"><div><b>Chat / formular pe site</b><p>Widget pentru site-ul firmei: întrebări, servicii, prețuri și cereri de programare.</p></div><span className="pending">PREGĂTIT ÎN PANOU</span></div>
      <div className="channel"><div><b>SMS prin Android</b><p>Telefon dedicat / aplicație gateway pentru SMS; separat de WhatsApp.</p></div><span className="pending">DE CONECTAT</span></div>
      <div className="channel"><div><b>Răspuns multilingv</b><p>Detectează limba clientului și răspunde în aceeași limbă; traducere liberă când conectăm motorul AI.</p></div><span className="pending">DEMO RO / ES / EN</span></div>
      <div className="channel"><div><b>n8n Cloud Engine</b><p>Workflow-uri, webhook-uri, rezervări, email, WhatsApp și reguli per firmă.</p></div><span className="pending">AȘTEAPTĂ RENDER</span></div>
    </section>
  </main>
}
