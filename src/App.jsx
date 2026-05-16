import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://chaesvwfjppnsedijlru.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoYWVzdndmanBwbnNlZGlqbHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzUwODgsImV4cCI6MjA5NDQ1MTA4OH0.p5L8FfxtvOGMmKWOYU_ALwiTJi3tdxJKRiZD58GRf00";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DEFAULT_WA_TEMPLATE = "Olá {contato}! Segue o link da proposta comercial que preparamos para vocês.\n\n📄 *{titulo}*\n🔗 https://{link}\n🔑 Senha de acesso: {senha}\n\n{apresentacao}\n\nQualquer dúvida estou à disposição. Abraço!";

const STATUS_CONFIG = {
  sent:     { label: "Enviada",    color: "#6B7280", bg: "#F3F4F6" },
  opened:   { label: "Aberta",     color: "#2563EB", bg: "#EFF6FF" },
  reading:  { label: "Em análise", color: "#D97706", bg: "#FFFBEB" },
  read:     { label: "Lida",       color: "#7C3AED", bg: "#F5F3FF" },
  accepted: { label: "Aceita",     color: "#059669", bg: "#ECFDF5" },
  refused:  { label: "Recusada",   color: "#DC2626", bg: "#FEF2F2" },
};

const EVENT_LABELS = {
  sent: "Proposta enviada", opened: "Proposta aberta",
  read: "Proposta lida", reading: "Em análise",
  accepted: "Proposta aceita", refused: "Proposta recusada",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function fmtDuration(s) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}min ${s%60}s`;
}
function genToken() { return Math.random().toString(36).substring(2,10); }
function genCode() { return String(Math.floor(100000 + Math.random()*900000)); }

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "error" ? "#DC2626" : "#111827";
  const icon = type === "error" ? "✕" : "✓";
  return (
    <div style={{ position:"fixed", bottom:32, right:32, background:bg, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:14, zIndex:9999, display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 30px rgba(0,0,0,0.3)", maxWidth:360 }}>
      <span>{icon}</span> {msg}
    </div>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  return <span style={{ background:c.bg, color:c.color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{c.label}</span>;
}

// ─── LOADING ─────────────────────────────────────────────────────────────────
function Loading({ text = "Carregando..." }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, flexDirection:"column", gap:16 }}>
      <div style={{ width:36, height:36, border:"3px solid #E2E8F0", borderTop:"3px solid #2563EB", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ fontSize:14, color:"#64748B" }}>{text}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, tenant, currentUser, onLogout }) {
  const nav = [
    { id:"dashboard", icon:"▦", label:"Dashboard" },
    { id:"proposals", icon:"≡", label:"Propostas" },
    { id:"clients",   icon:"♟", label:"Clientes" },
    ...(currentUser?.role === "admin" ? [{ id:"users", icon:"♙", label:"Usuários" }] : []),
    { id:"settings",  icon:"⚙", label:"Configurações" },
  ];
  const color = tenant?.color || "#E63946";
  return (
    <div style={{ width:220, background:"#0F172A", display:"flex", flexDirection:"column", height:"100vh", position:"fixed", left:0, top:0, zIndex:100 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid #1E293B" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:16 }}>
            {tenant?.logo || "P"}
          </div>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:13, lineHeight:1.2 }}>{tenant?.name?.split(" ")[0] || "Proposta+"}</div>
            <div style={{ color:"#64748B", fontSize:11 }}>Proposta+</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"12px 10px" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", background:page===n.id ? color+"22" : "transparent", color:page===n.id ? "#fff" : "#94A3B8", fontSize:14, fontWeight:page===n.id ? 600 : 400, marginBottom:2, transition:"all 0.15s", textAlign:"left" }}>
            <span style={{ fontSize:16 }}>{n.icon}</span> {n.label}
            {page===n.id && <div style={{ marginLeft:"auto", width:3, height:16, borderRadius:2, background:color }} />}
          </button>
        ))}
      </nav>
      <div style={{ padding:"16px 10px", borderTop:"1px solid #1E293B" }}>
        <div style={{ padding:"8px 12px", marginBottom:4 }}>
          <div style={{ color:"#fff", fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentUser?.name}</div>
          <span style={{ fontSize:10, background:currentUser?.role==="admin" ? color : "#334155", color:"#fff", padding:"2px 7px", borderRadius:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>
            {currentUser?.role==="admin" ? "Admin" : "Vendedor"}
          </span>
        </div>
        <button onClick={onLogout} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:"#64748B", fontSize:13, textAlign:"left", display:"flex", alignItems:"center", gap:8 }}>
          ↩ Sair
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ proposals, clients, users, tenant, currentUser, setPage }) {
  const visible = currentUser?.role==="admin" ? proposals : proposals.filter(p => p.user_id===currentUser?.id);
  const total = visible.length;
  const opened = visible.filter(p => ["opened","reading","read","accepted","refused"].includes(p.status)).length;
  const accepted = visible.filter(p => p.status==="accepted").length;
  const refused = visible.filter(p => p.status==="refused").length;
  const pending = visible.filter(p => ["sent","opened","reading"].includes(p.status)).length;
  const openRate = total ? Math.round((opened/total)*100) : 0;
  const convRate = opened ? Math.round((accepted/opened)*100) : 0;
  const alerts = visible.filter(p => ["sent","opened"].includes(p.status) && (Date.now()-new Date(p.created_at))/86400000 > 3);
  const maxW = 8;

  const Card = ({ label, value, sub, accent }) => (
    <div style={{ background:"#fff", borderRadius:14, padding:"20px 24px", border:"1px solid #E2E8F0", flex:1, minWidth:140 }}>
      <div style={{ fontSize:13, color:"#64748B", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:800, color:accent||"#0F172A", fontFamily:"Georgia,serif" }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"Georgia,serif" }}>Dashboard</h1>
        <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:14 }}>
          {currentUser?.role==="admin" ? "Visão geral de toda a empresa" : `Suas propostas — ${currentUser?.name}`}
        </p>
      </div>
      {alerts.length > 0 && (
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
          <span>⚠</span>
          <span style={{ fontSize:14, color:"#92400E" }}><strong>{alerts.length} proposta{alerts.length>1?"s":""}</strong> sem resposta há mais de 3 dias.{" "}
            <button onClick={() => setPage("proposals")} style={{ background:"none", border:"none", color:"#D97706", cursor:"pointer", fontWeight:600, fontSize:14, padding:0 }}>Ver propostas →</button>
          </span>
        </div>
      )}
      <div style={{ display:"flex", gap:16, marginBottom:20, flexWrap:"wrap" }}>
        <Card label="Total de Propostas" value={total} />
        <Card label="Taxa de Abertura" value={`${openRate}%`} sub={`${opened} de ${total} abertas`} accent={tenant?.color} />
        <Card label="Taxa de Conversão" value={`${convRate}%`} sub={`${accepted} aceitas`} accent="#059669" />
        <Card label="Aguardando Resposta" value={pending} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:16 }}>Status das Propostas</div>
          {[
            { label:"Aceitas", val:accepted, color:"#059669" },
            { label:"Recusadas", val:refused, color:"#DC2626" },
            { label:"Em aberto", val:pending, color:"#2563EB" },
          ].map(s => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:13, color:"#374151", flex:1 }}>{s.label}</span>
              <div style={{ flex:2, background:"#F1F5F9", borderRadius:4, height:6, overflow:"hidden" }}>
                <div style={{ width:total ? `${(s.val/total)*100}%` : "0%", height:"100%", background:s.color, borderRadius:4, transition:"width 0.6s ease" }} />
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:"#0F172A", width:20, textAlign:"right" }}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#fff", borderRadius:14, padding:24, border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:16 }}>Resumo Rápido</div>
          {[
            { label:"Propostas este mês", val:visible.filter(p => new Date(p.created_at) > new Date(Date.now()-30*86400000)).length },
            { label:"Clientes ativos", val:new Set(visible.map(p => p.client_id)).size },
            { label:"Taxa de recusa", val:`${total ? Math.round((refused/total)*100) : 0}%` },
          ].map(m => (
            <div key={m.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #F1F5F9" }}>
              <span style={{ fontSize:13, color:"#374151" }}>{m.label}</span>
              <span style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{m.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROPOSALS PAGE ──────────────────────────────────────────────────────────
function ProposalsPage({ proposals, setProposals, clients, setClients, users, tenant, currentUser, setToast, setViewProposal }) {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [selClient, setSelClient] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [propApresentacao, setPropApresentacao] = useState("");
  const [propObservacoes, setPropObservacoes] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name:"", contact:"", email:"", phone:"", notes:"" });
  const fileRef = useRef();

  const visible = currentUser?.role==="admin" ? proposals : proposals.filter(p => p.user_id===currentUser?.id);
  const filtered = visible.filter(p => {
    if (filter!=="all" && p.status!==filter) return false;
    const c = clients.find(c => c.id===p.client_id);
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase()) && !c?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => new Date(b.created_at)-new Date(a.created_at));

  function resetNew() {
    setShowNew(false); setNewTitle(""); setSelClient(""); setPdfFile(null);
    setPropApresentacao(""); setPropObservacoes("");
    setShowNewClientForm(false);
    setNewClientForm({ name:"", contact:"", email:"", phone:"", notes:"" });
  }

  async function handleCreate() {
    if (!newTitle || (!selClient && !newClientForm.name) || !pdfFile) {
      setToast({ msg:"Preencha o título, cliente e selecione o PDF.", type:"error" }); return;
    }
    setSaving(true);
    try {
      let clientId = selClient;
      if (!selClient && newClientForm.name) {
        const { data: nc, error: ce } = await supabase.from("clients").insert([{ ...newClientForm, tenant_id: currentUser.tenant_id }]).select().single();
        if (ce) throw ce;
        setClients(prev => [...prev, nc]);
        clientId = nc.id;
      }
      const token = genToken();
      const filePath = `${currentUser.tenant_id}/${token}/${pdfFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("proposals").upload(filePath, pdfFile);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("proposals").getPublicUrl(filePath);
      const { data: np, error: pe } = await supabase.from("proposals").insert([{
        client_id: clientId, user_id: currentUser.id, tenant_id: currentUser.tenant_id,
        title: newTitle, status:"sent", token, access_code: genCode(),
        pdf_url: publicUrl, apresentacao: propApresentacao, observacoes: propObservacoes,
      }]).select().single();
      if (pe) throw pe;
      await supabase.from("proposal_events").insert([{ proposal_id: np.id, event_type:"sent" }]);
      setProposals(prev => [{ ...np, events:[] }, ...prev]);
      setToast({ msg:"Proposta criada e link gerado com sucesso!" });
      resetNew();
    } catch (e) {
      console.error(e);
      setToast({ msg:"Erro ao criar proposta: " + (e.message || "tente novamente"), type:"error" });
    }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"Georgia,serif" }}>Propostas</h1>
          <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:14 }}>{visible.length} proposta{visible.length!==1?"s":""}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ background:tenant?.color, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          + Nova Proposta
        </button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {["all","sent","opened","reading","accepted","refused"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:"6px 14px", borderRadius:20, border:"1px solid", fontSize:13, cursor:"pointer", fontWeight:filter===f ? 700 : 400, background:filter===f ? tenant?.color : "#fff", color:filter===f ? "#fff" : "#374151", borderColor:filter===f ? tenant?.color : "#E2E8F0" }}>
            {f==="all" ? "Todas" : STATUS_CONFIG[f]?.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:20, border:"1px solid #E2E8F0", fontSize:13, outline:"none", minWidth:200 }} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length===0 && (
          <div style={{ textAlign:"center", padding:48, color:"#94A3B8", background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Nenhuma proposta encontrada</div>
          </div>
        )}
        {filtered.map(p => {
          const client = clients.find(c => c.id===p.client_id);
          const owner = users.find(u => u.id===p.user_id);
          const days = Math.floor((Date.now()-new Date(p.created_at))/86400000);
          const isAlert = ["sent","opened"].includes(p.status) && days > 3;
          return (
            <div key={p.id} onClick={() => setViewProposal(p.id)}
              style={{ background:"#fff", borderRadius:14, padding:"16px 20px", border:`1px solid ${isAlert ? "#FDE68A" : "#E2E8F0"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:16, position:"relative" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
              {isAlert && <div style={{ position:"absolute", top:12, right:12, fontSize:12, color:"#D97706" }}>⚠ {days}d sem resposta</div>}
              <div style={{ width:44, height:44, borderRadius:10, background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📄</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.title}</div>
                <div style={{ fontSize:13, color:"#64748B", display:"flex", alignItems:"center", gap:8 }}>
                  {client?.name} · {fmtDate(p.created_at)}
                  {currentUser?.role==="admin" && owner && (
                    <span style={{ fontSize:11, background:"#F1F5F9", color:"#64748B", padding:"2px 7px", borderRadius:10 }}>
                      {owner.name.split(" ")[0]}
                    </span>
                  )}
                </div>
              </div>
              <Badge status={p.status} />
            </div>
          );
        })}
      </div>

      {showNew && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:32, width:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>Nova Proposta</h2>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Título da proposta *</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: BMS Hospital São Lucas — Rev. 3"
                style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:showNewClientForm ? 0 : 16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Cliente *</label>
              <select value={selClient} onChange={e => { setSelClient(e.target.value); if (e.target.value) setShowNewClientForm(false); }}
                style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", background:"#fff" }}>
                <option value="">Selecionar cliente existente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {!selClient && !showNewClientForm && (
              <button onClick={() => setShowNewClientForm(true)}
                style={{ marginTop:8, marginBottom:16, background:"none", border:"1px dashed #CBD5E1", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, color:"#64748B", width:"100%", textAlign:"center" }}>
                + Cadastrar novo cliente
              </button>
            )}

            {!selClient && showNewClientForm && (
              <div style={{ marginTop:12, marginBottom:16, background:"#F8FAFC", borderRadius:10, border:"1px solid #E2E8F0", padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:12, display:"flex", justifyContent:"space-between" }}>
                  <span>Dados do novo cliente</span>
                  <button onClick={() => setShowNewClientForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", fontSize:18, padding:0 }}>×</button>
                </div>
                {[["name","Nome da empresa *","Ex: Hospital São Lucas"],["contact","Nome do contato","Ex: Dr. Marcos"],["email","E-mail","contato@empresa.com"],["phone","WhatsApp","11999001122"]].map(([k,l,ph]) => (
                  <div key={k} style={{ marginBottom:10 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:4 }}>{l}</label>
                    <input value={newClientForm[k]} onChange={e => setNewClientForm(f => ({...f,[k]:e.target.value}))} placeholder={ph}
                      style={{ width:"100%", padding:"8px 12px", border:"1px solid #E2E8F0", borderRadius:7, fontSize:13, outline:"none", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Apresentação da proposta</label>
              <textarea value={propApresentacao} onChange={e => setPropApresentacao(e.target.value)} rows={3}
                placeholder="Texto enviado ao cliente via WhatsApp e exibido na página da proposta..."
                style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit" }} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Observações internas</label>
              <textarea value={propObservacoes} onChange={e => setPropObservacoes(e.target.value)} rows={2}
                placeholder="Anotações internas (não visíveis para o cliente)..."
                style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"inherit", background:"#FFFBEB" }} />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Arquivo PDF *</label>
              <input ref={fileRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ display:"none" }} />
              <div onClick={() => fileRef.current.click()}
                style={{ border:`2px dashed ${pdfFile ? "#059669" : "#E2E8F0"}`, borderRadius:8, padding:"20px", textAlign:"center", cursor:"pointer", background:pdfFile ? "#F0FDF4" : "#F8FAFC", transition:"all 0.2s" }}>
                {pdfFile
                  ? <span style={{ color:"#059669", fontWeight:600 }}>✓ {pdfFile.name} ({(pdfFile.size/1024/1024).toFixed(1)}MB)</span>
                  : <span style={{ color:"#94A3B8", fontSize:14 }}>Clique para selecionar o PDF do computador</span>}
              </div>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={resetNew} disabled={saving} style={{ padding:"10px 20px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontSize:14 }}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                style={{ padding:"10px 20px", background:saving ? "#94A3B8" : tenant?.color, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:saving ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando..." : "Criar e Gerar Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROPOSAL DETAIL ─────────────────────────────────────────────────────────
function ProposalDetail({ proposal, clients, users, tenant, setToast, onBack, setClientViewToken }) {
  const [events, setEvents] = useState(proposal.events || []);
  const client = clients.find(c => c.id===proposal.client_id);
  const owner = users.find(u => u.id===proposal.user_id);
  const link = `${window.location.origin}/p/${proposal.token}`;
  const template = tenant?.waTemplate || DEFAULT_WA_TEMPLATE;
  const waMsgRaw = template
    .replace("{contato}", client?.contact?.split(" ")[0] || "")
    .replace("{titulo}", proposal.title)
    .replace("{link}", link)
    .replace("{senha}", proposal.access_code)
    .replace("{apresentacao}", proposal.apresentacao || "");
  const waMsg = encodeURIComponent(waMsgRaw);

  useEffect(() => {
    supabase.from("proposal_events").select("*").eq("proposal_id", proposal.id).order("created_at").then(({ data }) => { if (data) setEvents(data); });
  }, [proposal.id]);

  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748B", fontSize:14, padding:0, marginBottom:20, display:"flex", alignItems:"center", gap:6 }}>← Voltar</button>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:"0 0 6px", fontFamily:"Georgia,serif" }}>{proposal.title}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Badge status={proposal.status} />
            <span style={{ fontSize:13, color:"#64748B" }}>Criada em {fmtDate(proposal.created_at)}</span>
            {owner && <span style={{ fontSize:12, background:"#F1F5F9", color:"#64748B", padding:"2px 8px", borderRadius:10 }}>{owner.name}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <a href={`https://wa.me/55${client?.phone?.replace(/\D/g,"")}?text=${waMsg}`} target="_blank" rel="noreferrer"
            style={{ background:"#25D366", color:"#fff", border:"none", borderRadius:10, padding:"10px 16px", fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
            WhatsApp
          </a>
          <button onClick={() => { navigator.clipboard?.writeText(link); setToast({ msg:"Link copiado!" }); }}
            style={{ background:"#fff", color:"#374151", border:"1px solid #E2E8F0", borderRadius:10, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Copiar Link
          </button>
          <button onClick={() => setClientViewToken(proposal.token)}
            style={{ background:"#EFF6FF", color:"#2563EB", border:"1px solid #BFDBFE", borderRadius:10, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Ver como cliente
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:12, color:"#64748B", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Cliente</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{client?.name}</div>
          <div style={{ fontSize:13, color:"#64748B" }}>{client?.contact}</div>
          <div style={{ fontSize:13, color:"#64748B" }}>{client?.email}</div>
          {client?.phone && <div style={{ fontSize:13, color:"#64748B" }}>{client?.phone}</div>}
        </div>
        <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:12, color:"#64748B", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Link e Acesso</div>
          <div style={{ fontSize:12, color:"#2563EB", marginBottom:8, wordBreak:"break-all" }}>{link}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:"#64748B" }}>Senha:</span>
            <span style={{ background:"#F1F5F9", padding:"2px 10px", borderRadius:6, fontWeight:700, fontFamily:"monospace", fontSize:15, letterSpacing:3 }}>{proposal.access_code}</span>
          </div>
          {proposal.pdf_url && (
            <a href={proposal.pdf_url} target="_blank" rel="noreferrer"
              style={{ display:"inline-block", marginTop:10, fontSize:12, color:"#2563EB", textDecoration:"none" }}>
              Visualizar PDF →
            </a>
          )}
        </div>
      </div>

      {(proposal.apresentacao || proposal.observacoes) && (
        <div style={{ display:"grid", gridTemplateColumns:proposal.apresentacao && proposal.observacoes ? "1fr 1fr" : "1fr", gap:16, marginBottom:20 }}>
          {proposal.apresentacao && (
            <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #E2E8F0" }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Apresentação</div>
              <p style={{ fontSize:14, color:"#374151", margin:0, lineHeight:1.6 }}>{proposal.apresentacao}</p>
            </div>
          )}
          {proposal.observacoes && (
            <div style={{ background:"#FFFBEB", borderRadius:14, padding:20, border:"1px solid #FDE68A" }}>
              <div style={{ fontSize:12, color:"#92400E", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Obs. internas</div>
              <p style={{ fontSize:14, color:"#78350F", margin:0, lineHeight:1.6 }}>{proposal.observacoes}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #E2E8F0" }}>
        <div style={{ fontSize:12, color:"#64748B", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Timeline de Eventos</div>
        {events.length===0 && <div style={{ color:"#94A3B8", fontSize:13 }}>Nenhum evento registrado ainda.</div>}
        {events.map((e, i) => (
          <div key={e.id||i} style={{ display:"flex", gap:16, paddingBottom:i<events.length-1?20:0, position:"relative" }}>
            {i<events.length-1 && <div style={{ position:"absolute", left:15, top:32, bottom:0, width:2, background:"#F1F5F9" }} />}
            <div style={{ width:32, height:32, borderRadius:"50%", background:e.event_type==="accepted"?"#ECFDF5":e.event_type==="refused"?"#FEF2F2":"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, border:"2px solid #fff", boxShadow:"0 0 0 2px #E2E8F0" }}>
              {e.event_type==="accepted"?"✓":e.event_type==="refused"?"✗":e.event_type==="opened"?"👁":e.event_type==="read"?"📖":"📤"}
            </div>
            <div style={{ paddingTop:4, flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#0F172A" }}>{EVENT_LABELS[e.event_type]||e.event_type}</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>{fmtDate(e.created_at)}{e.device_type?` · ${e.device_type}`:""}{e.duration_seconds?` · ${fmtDuration(e.duration_seconds)}`:""}</div>
              {e.comment_text && <div style={{ marginTop:8, background:"#F8FAFC", borderLeft:`3px solid ${tenant?.color}`, padding:"8px 12px", borderRadius:"0 8px 8px 0", fontSize:13, color:"#374151", fontStyle:"italic" }}>"{e.comment_text}"</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENTS PAGE ─────────────────────────────────────────────────────────────
function ClientsPage({ clients, setClients, proposals, tenant, currentUser, setToast }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", contact:"", email:"", phone:"", notes:"" });

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingId) {
        const { data, error } = await supabase.from("clients").update({ ...form }).eq("id", editingId).select().single();
        if (error) throw error;
        setClients(prev => prev.map(c => c.id===editingId ? data : c));
        setToast({ msg:"Cliente atualizado!" });
      } else {
        const { data, error } = await supabase.from("clients").insert([{ ...form, tenant_id: currentUser.tenant_id }]).select().single();
        if (error) throw error;
        setClients(prev => [...prev, data]);
        setToast({ msg:"Cliente cadastrado!" });
      }
      setShowNew(false); setEditingId(null); setForm({ name:"", contact:"", email:"", phone:"", notes:"" });
    } catch(e) {
      setToast({ msg:"Erro: "+e.message, type:"error" });
    }
    setSaving(false);
  }

  function handleEdit(c) { setEditingId(c.id); setForm({ name:c.name||"", contact:c.contact||"", email:c.email||"", phone:c.phone||"", notes:c.notes||"" }); setShowNew(true); }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"Georgia,serif" }}>Clientes</h1>
          <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:14 }}>{clients.length} clientes</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name:"", contact:"", email:"", phone:"", notes:"" }); setShowNew(true); }}
          style={{ background:tenant?.color, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          + Novo Cliente
        </button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {clients.map(c => {
          const cProps = proposals.filter(p => p.client_id===c.id);
          const acc = cProps.filter(p => p.status==="accepted").length;
          return (
            <div key={c.id} style={{ background:"#fff", borderRadius:14, padding:"16px 20px", border:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:(tenant?.color||"#E63946")+"15", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, color:tenant?.color||"#E63946", flexShrink:0 }}>
                {c.name?.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{c.name}</div>
                <div style={{ fontSize:13, color:"#64748B" }}>{c.contact} {c.email ? `· ${c.email}` : ""} {c.phone ? `· ${c.phone}` : ""}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{cProps.length} proposta{cProps.length!==1?"s":""}</div>
                  <div style={{ fontSize:12, color:"#059669" }}>{acc} aceita{acc!==1?"s":""}</div>
                </div>
                <button onClick={() => handleEdit(c)}
                  style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:13, color:"#374151", fontWeight:600 }}>
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {showNew && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:32, width:440, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>{editingId ? "Editar Cliente" : "Novo Cliente"}</h2>
            {[["name","Nome da empresa *"],["contact","Nome do contato"],["email","E-mail"],["phone","WhatsApp"],["notes","Observações"]].map(([k,l]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>{l}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => { setShowNew(false); setEditingId(null); }} style={{ padding:"10px 20px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontSize:14 }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:"10px 20px", background:saving?"#94A3B8":tenant?.color, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:saving?"not-allowed":"pointer" }}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ users, setUsers, tenant, currentUser, setToast }) {
  const tenantUsers = users.filter(u => u.tenant_id===currentUser.tenant_id);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"vendedor" });

  async function handleSave() {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      if (editingId) {
        const upd = { name: form.name, role: form.role };
        const { data, error } = await supabase.from("users").update(upd).eq("id", editingId).select().single();
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id===editingId ? { ...u, ...data } : u));
        setToast({ msg:"Usuário atualizado!" });
      } else {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ email: form.email, password: form.password, email_confirm: true });
        if (authErr) throw authErr;
        const { data, error } = await supabase.from("users").insert([{ id: authData.user.id, name: form.name, role: form.role, tenant_id: currentUser.tenant_id }]).select().single();
        if (error) throw error;
        setUsers(prev => [...prev, { ...data, email: form.email }]);
        setToast({ msg:"Usuário criado!" });
      }
      setShowNew(false); setEditingId(null); setForm({ name:"", email:"", password:"", role:"vendedor" });
    } catch(e) {
      setToast({ msg:"Erro: "+e.message, type:"error" });
    }
    setSaving(false);
  }

  async function handleToggleRole(u) {
    if (u.id===currentUser.id) { setToast({ msg:"Não é possível alterar sua própria função.", type:"error" }); return; }
    const newRole = u.role==="admin" ? "vendedor" : "admin";
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", u.id);
    if (!error) setUsers(prev => prev.map(x => x.id===u.id ? { ...x, role: newRole } : x));
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", margin:0, fontFamily:"Georgia,serif" }}>Usuários</h1>
          <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:14 }}>{tenantUsers.length} usuários</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name:"", email:"", password:"", role:"vendedor" }); setShowNew(true); }}
          style={{ background:tenant?.color, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          + Novo Usuário
        </button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {tenantUsers.map(u => (
          <div key={u.id} style={{ background:"#fff", borderRadius:14, padding:"16px 20px", border:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:u.role==="admin" ? tenant?.color : "#E2E8F0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:u.role==="admin"?"#fff":"#64748B", flexShrink:0 }}>
              {u.name?.charAt(0)}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{u.name}</span>
                {u.id===currentUser.id && <span style={{ fontSize:11, color:"#64748B", background:"#F1F5F9", padding:"2px 8px", borderRadius:10 }}>você</span>}
              </div>
              <div style={{ fontSize:13, color:"#64748B" }}>{u.email}</div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={() => handleToggleRole(u)} disabled={u.id===currentUser.id}
                style={{ padding:"5px 12px", borderRadius:20, border:"1px solid", fontSize:12, fontWeight:700, cursor:u.id===currentUser.id?"not-allowed":"pointer", opacity:u.id===currentUser.id?0.5:1, background:u.role==="admin"?(tenant?.color||"#E63946")+"15":"#F1F5F9", color:u.role==="admin"?tenant?.color:"#64748B", borderColor:u.role==="admin"?tenant?.color:"#E2E8F0" }}>
                {u.role==="admin" ? "Admin" : "Vendedor"}
              </button>
              <button onClick={() => { setEditingId(u.id); setForm({ name:u.name||"", email:u.email||"", password:"", role:u.role||"vendedor" }); setShowNew(true); }}
                style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:13, color:"#374151", fontWeight:600 }}>
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
      {showNew && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:32, width:440, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>{editingId?"Editar Usuário":"Novo Usuário"}</h2>
            {[["name","Nome completo *"],["email","E-mail *"],["password","Senha"]].map(([k,l]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>{l}</label>
                <input type={k==="password"?"password":"text"} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  placeholder={k==="password"&&editingId?"Deixe em branco para manter":""}
                  style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:8 }}>Função</label>
              <div style={{ display:"flex", gap:10 }}>
                {["vendedor","admin"].map(r => (
                  <button key={r} onClick={() => setForm(f => ({...f,role:r}))}
                    style={{ flex:1, padding:"10px 0", borderRadius:8, border:"2px solid", cursor:"pointer", fontSize:14, fontWeight:700, background:form.role===r?tenant?.color:"#fff", color:form.role===r?"#fff":"#374151", borderColor:form.role===r?tenant?.color:"#E2E8F0" }}>
                    {r==="admin" ? "Admin" : "Vendedor"}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:8, fontSize:12, color:"#94A3B8" }}>
                {form.role==="admin" ? "Vê todas as propostas da empresa e gerencia usuários." : "Vê apenas suas próprias propostas."}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => { setShowNew(false); setEditingId(null); }} style={{ padding:"10px 20px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontSize:14 }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:"10px 20px", background:saving?"#94A3B8":tenant?.color, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:saving?"not-allowed":"pointer" }}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ tenant, setTenant, currentUser, setToast }) {
  const [form, setForm] = useState({ ...tenant });
  const [saving, setSaving] = useState(false);

 async function handleSave() {
  setSaving(true);
  const { error } = await supabase
    .from("tenants")
    .update({
      name: form.name,
      logo: form.logo,
      color: form.color,
      email: form.email,
      wa_template: form.waTemplate,
    })
    .eq("id", currentUser.tenant_id);
  if (error) {
    setToast({ msg: "Erro ao salvar: " + error.message, type: "error" });
  } else {
    setTenant(form);
    setToast({ msg: "Configurações salvas!" });
  }
  setSaving(false);
}

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", margin:"0 0 24px", fontFamily:"Georgia,serif" }}>Configurações</h1>
      <div style={{ background:"#fff", borderRadius:14, padding:28, border:"1px solid #E2E8F0", maxWidth:560 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:20 }}>Identidade Visual</div>
        {[["name","Nome da empresa"],["email","E-mail do remetente"]].map(([k,l]) => (
          <div key={k} style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>{l}</label>
            <input value={form[k]||""} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Cor primária</label>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <input type="color" value={form.color||"#E63946"} onChange={e => setForm(f => ({...f,color:e.target.value}))} style={{ width:48, height:40, border:"1px solid #E2E8F0", borderRadius:8, cursor:"pointer", padding:2 }} />
            <input value={form.color||""} onChange={e => setForm(f => ({...f,color:e.target.value}))} style={{ padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", width:120, fontFamily:"monospace" }} />
            <div style={{ width:40, height:40, borderRadius:8, background:form.color||"#E63946" }} />
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Mensagem padrão do WhatsApp</label>
          <textarea value={form.waTemplate||DEFAULT_WA_TEMPLATE} onChange={e => setForm(f => ({...f,waTemplate:e.target.value}))} rows={7}
            style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"monospace", lineHeight:1.6 }} />
          <div style={{ marginTop:6, fontSize:12, color:"#64748B", lineHeight:1.8 }}>
            Variáveis: <code style={{ background:"#F1F5F9", padding:"1px 5px", borderRadius:4 }}>{"{contato}"}</code>{" "}
            <code style={{ background:"#F1F5F9", padding:"1px 5px", borderRadius:4 }}>{"{titulo}"}</code>{" "}
            <code style={{ background:"#F1F5F9", padding:"1px 5px", borderRadius:4 }}>{"{link}"}</code>{" "}
            <code style={{ background:"#F1F5F9", padding:"1px 5px", borderRadius:4 }}>{"{senha}"}</code>{" "}
            <code style={{ background:"#F1F5F9", padding:"1px 5px", borderRadius:4 }}>{"{apresentacao}"}</code>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding:"10px 24px", background:saving?"#94A3B8":form.color||"#E63946", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

// ─── CLIENT VIEW (página pública) ─────────────────────────────────────────────
function ClientView({ token, onBack }) {
  const [proposal, setProposal] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [client, setClient] = useState(null);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [timeRead, setTimeRead] = useState(0);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("proposals").select("*").eq("token", token).single().then(({ data, error }) => {
      if (data) {
        setProposal(data);
        const existing = data.status;
        if (["accepted","refused"].includes(existing)) setDecision(existing);
        supabase.from("clients").select("*").eq("id", data.client_id).single().then(({ data: cd }) => setClient(cd));
        supabase.from("tenants").select("*").eq("id", data.tenant_id).single().then(({ data: td }) => setTenant(td));
      }
      setLoading(false);
    });
  }, [token]);

  function handleUnlock() {
    if (code === proposal?.access_code) {
      setUnlocked(true); setError("");
      supabase.from("proposal_events").insert([{ proposal_id: proposal.id, event_type:"opened", device_type: window.innerWidth<768?"mobile":"desktop" }]);
      supabase.from("proposals").update({ status:"opened" }).eq("id", proposal.id).then(() => {});
      timerRef.current = setInterval(() => setTimeRead(t => t+1), 1000);
    } else { setError("Senha incorreta. Verifique com o seu contato."); }
  }

  async function handleDecision(type) {
    if (type==="refused" && !comment) return;
    clearInterval(timerRef.current);
    await supabase.from("proposal_events").insert([{ proposal_id: proposal.id, event_type: type, comment_text: comment, duration_seconds: timeRead }]);
    await supabase.from("proposals").update({ status: type }).eq("id", proposal.id);
    setDecision(type); setShowModal(null);
  }

  const color = tenant?.color || "#E63946";

  if (loading) return <Loading text="Carregando proposta..." />;
  if (!proposal) return <div style={{ textAlign:"center", padding:60, color:"#94A3B8" }}>Proposta não encontrada.</div>;

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"16px 32px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:16 }}>
          {tenant?.logo || "P"}
        </div>
        <div>
          <div style={{ fontWeight:700, color:"#0F172A", fontSize:15 }}>{tenant?.name}</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Proposta Comercial</div>
        </div>
        {onBack && <button onClick={onBack} style={{ marginLeft:"auto", background:"none", border:"1px solid #E2E8F0", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, color:"#64748B" }}>← Voltar</button>}
      </div>

      {!unlocked ? (
        <div style={{ maxWidth:400, margin:"80px auto", background:"#fff", borderRadius:16, padding:40, boxShadow:"0 4px 30px rgba(0,0,0,0.08)", border:"1px solid #E2E8F0", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔐</div>
          <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>Acesso à Proposta</h2>
          <p style={{ color:"#64748B", fontSize:14, margin:"0 0 24px" }}>Digite o código de acesso enviado pelo WhatsApp</p>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key==="Enter" && handleUnlock()} placeholder="000000" maxLength={6}
            style={{ width:"100%", padding:14, border:`2px solid ${error?"#DC2626":"#E2E8F0"}`, borderRadius:10, fontSize:28, fontWeight:800, textAlign:"center", letterSpacing:10, outline:"none", boxSizing:"border-box", fontFamily:"monospace", marginBottom:12 }} />
          {error && <div style={{ color:"#DC2626", fontSize:13, marginBottom:12 }}>{error}</div>}
          <button onClick={handleUnlock} style={{ width:"100%", background:color, color:"#fff", border:"none", borderRadius:10, padding:14, fontWeight:700, fontSize:16, cursor:"pointer" }}>Acessar Proposta</button>
        </div>
      ) : (
        <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 20px" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, border:"1px solid #E2E8F0", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:12, color:"#94A3B8", marginBottom:4 }}>PROPOSTA PARA</div>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>{client?.name}</h1>
                <div style={{ fontSize:14, color:"#64748B", marginTop:4 }}>{proposal.title}</div>
                {proposal.apresentacao && (
                  <div style={{ marginTop:12, padding:"12px 16px", background:"#F8FAFC", borderRadius:8, borderLeft:`3px solid ${color}`, fontSize:14, color:"#374151", lineHeight:1.6 }}>
                    {proposal.apresentacao}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {proposal.pdf_url && (
                  <a href={proposal.pdf_url} target="_blank" rel="noreferrer"
                    style={{ background:"#F8FAFC", color:"#374151", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                    Baixar / Imprimir
                  </a>
                )}
              </div>
            </div>
            <div style={{ marginTop:12, fontSize:12, color:"#94A3B8" }}>Tempo de leitura: {timeRead}s</div>
          </div>

          {proposal.pdf_url && (
            <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E2E8F0", marginBottom:20, overflow:"hidden" }}>
              <iframe src={proposal.pdf_url} width="100%" height="600px" style={{ border:"none", display:"block" }} title="Proposta" />
            </div>
          )}

          {!decision && (
            <div style={{ background:"#fff", borderRadius:16, padding:24, border:"1px solid #E2E8F0", display:"flex", gap:12, alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:14, color:"#64748B" }}>Qual é a sua decisão sobre esta proposta?</span>
              <button onClick={() => setShowModal("accepted")} style={{ background:"#059669", color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontWeight:700, fontSize:15, cursor:"pointer" }}>Aceitar Proposta</button>
              <button onClick={() => setShowModal("refused")} style={{ background:"#fff", color:"#DC2626", border:"2px solid #DC2626", borderRadius:10, padding:"12px 24px", fontWeight:700, fontSize:15, cursor:"pointer" }}>Recusar Proposta</button>
            </div>
          )}

          {decision && (
            <div style={{ background:decision==="accepted"?"#ECFDF5":"#FEF2F2", borderRadius:16, padding:24, border:`1px solid ${decision==="accepted"?"#A7F3D0":"#FECACA"}`, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>{decision==="accepted"?"🎉":"😔"}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#0F172A" }}>{decision==="accepted"?"Proposta aceita!":"Proposta recusada"}</div>
              <div style={{ fontSize:14, color:"#64748B", marginTop:6 }}>Sua resposta foi registrada. Em breve entraremos em contato.</div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:32, width:440, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>{showModal==="accepted"?"Aceitar proposta":"Recusar proposta"}</h2>
            <p style={{ color:"#64748B", fontSize:14, margin:"0 0 20px" }}>{showModal==="accepted"?"Comentário opcional para o vendedor.":"Informe o motivo da recusa."}</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={showModal==="accepted"?"Comentário opcional...":"Motivo da recusa (obrigatório)..."} rows={3}
              style={{ width:"100%", padding:"10px 14px", border:"1px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", marginBottom:20 }} />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowModal(null)} style={{ padding:"10px 20px", border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontSize:14 }}>Cancelar</button>
              <button onClick={() => handleDecision(showModal)} disabled={showModal==="refused"&&!comment}
                style={{ padding:"10px 20px", background:showModal==="accepted"?"#059669":"#DC2626", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:showModal==="refused"&&!comment?"not-allowed":"pointer", opacity:showModal==="refused"&&!comment?0.5:1 }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!email || !pass) { setErr("Preencha e-mail e senha."); return; }
    setLoading(true); setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr("E-mail ou senha inválidos."); setLoading(false); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", data.user.id).single();
    const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", userData?.tenant_id).single();
    onLogin(tenantData || {}, { ...userData, email: data.user.email });
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif" }}>
      <div style={{ width:400, background:"#fff", borderRadius:20, padding:40, boxShadow:"0 30px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:"#0F172A", fontFamily:"Georgia,serif" }}>Proposta+</h1>
          <p style={{ color:"#64748B", margin:"6px 0 0", fontSize:14 }}>Gestão e envio de propostas comerciais</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width:"100%", padding:"12px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Senha</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width:"100%", padding:"12px 14px", border:"1px solid #E2E8F0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        </div>
        {err && <div style={{ color:"#DC2626", fontSize:13, marginBottom:12, marginTop:8 }}>{err}</div>}
        <button onClick={handle} disabled={loading}
          style={{ width:"100%", background:loading?"#94A3B8":"#E63946", color:"#fff", border:"none", borderRadius:10, padding:14, fontWeight:700, fontSize:16, cursor:loading?"not-allowed":"pointer", marginTop:12 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tenant, setTenant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [toast, setToastState] = useState(null);
  const [viewProposalId, setViewProposalId] = useState(null);
  const [clientViewToken, setClientViewToken] = useState(null);
  const [loading, setLoading] = useState(true);

  function setToast(t) { setToastState(t); setTimeout(() => setToastState(null), 4500); }

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `* { box-sizing: border-box; } body { margin: 0; font-family: system-ui, sans-serif; background: #F1F5F9; } @keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);

    // Checar sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single();
        if (userData) {
          const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", userData.tenant_id).single();
          setCurrentUser({ ...userData, email: session.user.email, tenant_id: userData.tenant_id });
          setTenant(tenantData || {});
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Carregar dados do tenant
    supabase.from("clients").select("*").eq("tenant_id", currentUser.tenant_id).then(({ data }) => { if (data) setClients(data); });
    supabase.from("proposals").select("*").eq("tenant_id", currentUser.tenant_id).order("created_at", { ascending:false }).then(({ data }) => { if (data) setProposals(data); });
    supabase.from("users").select("*").eq("tenant_id", currentUser.tenant_id).then(({ data }) => { if (data) setUsers(data); });
  }, [currentUser]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setTenant(null); setCurrentUser(null); setUsers([]); setProposals([]); setClients([]);
  }

  function handleLogin(t, u) { setTenant(t); setCurrentUser(u); }

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F1F5F9" }}>
      <Loading text="Iniciando Proposta+..." />
    </div>
  );

  if (!currentUser) return <Login onLogin={handleLogin} />;

  if (clientViewToken) return <ClientView token={clientViewToken} onBack={() => setClientViewToken(null)} />;

  const viewProposal = viewProposalId ? proposals.find(p => p.id===viewProposalId) : null;

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar page={page} setPage={p => { setPage(p); setViewProposalId(null); }} tenant={tenant} currentUser={currentUser} onLogout={handleLogout} />
      <main style={{ marginLeft:220, flex:1, padding:"32px 36px", minHeight:"100vh" }}>
        {page==="dashboard" && <Dashboard proposals={proposals} clients={clients} users={users} tenant={tenant} currentUser={currentUser} setPage={setPage} />}
        {page==="proposals" && !viewProposal && (
          <ProposalsPage proposals={proposals} setProposals={setProposals} clients={clients} setClients={setClients} users={users} tenant={tenant} currentUser={currentUser} setToast={setToast} setViewProposal={setViewProposalId} />
        )}
        {page==="proposals" && viewProposal && (
          <>
            <ProposalDetail proposal={viewProposal} clients={clients} users={users} tenant={tenant} setToast={setToast} onBack={() => setViewProposalId(null)} setClientViewToken={setClientViewToken} />
          </>
        )}
        {page==="clients" && <ClientsPage clients={clients} setClients={setClients} proposals={proposals} tenant={tenant} currentUser={currentUser} setToast={setToast} />}
        {page==="users" && currentUser?.role==="admin" && <UsersPage users={users} setUsers={setUsers} tenant={tenant} currentUser={currentUser} setToast={setToast} />}
        {page==="settings" && <SettingsPage tenant={tenant} setTenant={setTenant} currentUser={currentUser} setToast={setToast} />}
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToastState(null)} />}
    </div>
  );
}
