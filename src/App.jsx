import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://chaesvwfjppnsedijlru.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoYWVzdndmanBwbnNlZGlqbHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzUwODgsImV4cCI6MjA5NDQ1MTA4OH0.p5L8FfxtvOGMmKWOYU_ALwiTJi3tdxJKRiZD58GRf00"
);

const DEFAULT_WA = "Olá {contato}! Segue o link da proposta comercial.\n\n📄 *{titulo}*\n🔗 https://{link}\n🔑 Senha: {senha}\n\n{apresentacao}\n\nQualquer dúvida estou à disposição!";

const STATUS = {
  sent:     { label: "Enviada",    color: "#6B7280", bg: "#F3F4F6" },
  opened:   { label: "Aberta",     color: "#2563EB", bg: "#EFF6FF" },
  reading:  { label: "Em análise", color: "#D97706", bg: "#FFFBEB" },
  read:     { label: "Lida",       color: "#7C3AED", bg: "#F5F3FF" },
  accepted: { label: "Aceita",     color: "#059669", bg: "#ECFDF5" },
  refused:  { label: "Recusada",   color: "#DC2626", bg: "#FEF2F2" },
};

const EVENT_LABEL = {
  sent: "Proposta enviada", opened: "Proposta aberta",
  read: "Proposta lida", accepted: "Proposta aceita", refused: "Proposta recusada",
};

const fmtDate = (iso) => !iso ? "—" : new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
const fmtSec = (s) => !s ? "—" : s < 60 ? `${s}s` : `${Math.floor(s/60)}min ${s%60}s`;
const genToken = () => Math.random().toString(36).substring(2, 10);
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

function GlobalStyle() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F1F5F9; color: #0F172A; } input, textarea, select, button { font-family: inherit; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }`;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

function Spinner({ size = 32, color = "#2563EB" }) {
  return <div style={{ width: size, height: size, border: `3px solid #E2E8F0`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
}

function Loading({ text = "Carregando..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 64 }}>
      <Spinner />
      <span style={{ fontSize: 14, color: "#64748B" }}>{text}</span>
    </div>
  );
}

function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: type === "error" ? "#DC2626" : "#0F172A", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", maxWidth: 380, animation: "fadeIn 0.25s ease" }}>
      <span>{type === "error" ? "✕" : "✓"}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.sent;
  return <span style={{ display: "inline-block", background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Btn({ children, onClick, color = "#2563EB", outline = false, disabled = false, size = "md", style: extra = {} }) {
  const pad = size === "sm" ? "6px 12px" : size === "lg" ? "13px 28px" : "9px 18px";
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: pad, fontSize: fs, fontWeight: 600, borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer", border: outline ? `1.5px solid ${color}` : "none", background: disabled ? "#94A3B8" : outline ? "transparent" : color, color: outline ? color : "#fff", opacity: disabled ? 0.7 : 1, transition: "opacity 0.15s", whiteSpace: "nowrap", ...extra }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required = false, rows }) {
  const base = { width: "100%", padding: "10px 13px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", color: "#0F172A", transition: "border-color 0.15s" };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}{required && <span style={{ color: "#DC2626", marginLeft: 2 }}>*</span>}</label>}
      {rows
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...base, resize: "vertical", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#2563EB"} onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base} onFocus={e => e.target.style.borderColor = "#2563EB"} onBlur={e => e.target.style.borderColor = "#E2E8F0"} />}
    </div>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", animation: "fadeIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: "#0F172A" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94A3B8", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ children, style: extra = {} }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "18px 22px", ...extra }}>{children}</div>;
}

function Sidebar({ page, setPage, tenant, currentUser, onLogout }) {
  const color = tenant?.color || "#E63946";
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "proposals", label: "Propostas", icon: "≡" },
    { id: "clients", label: "Clientes", icon: "♟" },
    ...(currentUser?.role === "admin" ? [{ id: "users", label: "Usuários", icon: "♙" }] : []),
    { id: "settings", label: "Configurações", icon: "⚙" },
  ];
  return (
    <aside style={{ width: 220, background: "#0F172A", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100 }}>
      <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 17, flexShrink: 0 }}>{tenant?.logo || "P"}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tenant?.name?.split(" ")[0] || "Empresa"}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>Proposta+</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {nav.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? color + "25" : "transparent", color: active ? "#fff" : "#94A3B8", fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2, transition: "all 0.15s", textAlign: "left" }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{n.icon}</span>
              <span>{n.label}</span>
              {active && <div style={{ marginLeft: "auto", width: 3, height: 16, borderRadius: 2, background: color }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 8px", borderTop: "1px solid #1E293B" }}>
        <div style={{ padding: "8px 12px", marginBottom: 6 }}>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name}</div>
          <span style={{ fontSize: 10, background: currentUser?.role === "admin" ? color : "#334155", color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "inline-block", marginTop: 3 }}>{currentUser?.role === "admin" ? "Admin" : "Vendedor"}</span>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#64748B", fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
          <span>↩</span> Sair
        </button>
      </div>
    </aside>
  );
}

function Dashboard({ proposals, clients, tenant, currentUser, setPage }) {
  const color = tenant?.color || "#E63946";
  const mine = currentUser?.role === "admin" ? proposals : proposals.filter(p => p.user_id === currentUser?.id);
  const total = mine.length;
  const opened = mine.filter(p => ["opened","reading","read","accepted","refused"].includes(p.status)).length;
  const accepted = mine.filter(p => p.status === "accepted").length;
  const refused = mine.filter(p => p.status === "refused").length;
  const pending = mine.filter(p => ["sent","opened","reading"].includes(p.status)).length;
  const openRate = total ? Math.round((opened/total)*100) : 0;
  const convRate = opened ? Math.round((accepted/opened)*100) : 0;
  const alerts = mine.filter(p => ["sent","opened"].includes(p.status) && (Date.now()-new Date(p.created_at))/86400000 > 3);
  const bars = [4,6,3,8,5,7, mine.filter(p => new Date(p.created_at) > new Date(Date.now()-7*86400000)).length || 2];
  const maxBar = Math.max(...bars, 1);

  const MetricCard = ({ label, value, sub, accent }) => (
    <Card style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent || "#0F172A", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Dashboard</h1>
        <p style={{ color: "#64748B", fontSize: 14, marginTop: 3 }}>{currentUser?.role === "admin" ? "Visão geral da empresa" : `Suas propostas — ${currentUser?.name}`}</p>
      </div>
      {alerts.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <span style={{ fontSize: 14, color: "#92400E" }}><strong>{alerts.length} proposta{alerts.length>1?"s":""}</strong> sem resposta há mais de 3 dias. <button onClick={() => setPage("proposals")} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", fontWeight: 700, fontSize: 14, padding: 0, textDecoration: "underline" }}>Ver agora</button></span>
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <MetricCard label="Total de Propostas" value={total} />
        <MetricCard label="Taxa de Abertura" value={`${openRate}%`} sub={`${opened} de ${total}`} accent={color} />
        <MetricCard label="Taxa de Conversão" value={`${convRate}%`} sub={`${accepted} aceitas`} accent="#059669" />
        <MetricCard label="Aguardando Resposta" value={pending} accent={pending > 0 ? "#D97706" : undefined} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Propostas — últimas semanas</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
            {bars.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: `${(v/maxBar)*70}px`, minHeight: 4, background: i === bars.length-1 ? color : "#E2E8F0", borderRadius: "4px 4px 0 0" }} />
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{i === bars.length-1 ? "Essa" : `S${i+1}`}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Distribuição por status</div>
          {[{ label:"Aceitas", val:accepted, color:"#059669" },{ label:"Recusadas", val:refused, color:"#DC2626" },{ label:"Em aberto", val:pending, color:"#2563EB" },{ label:"Enviadas", val:mine.filter(p=>p.status==="sent").length, color:"#6B7280" }].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{s.label}</span>
              <div style={{ flex: 2, background: "#F1F5F9", borderRadius: 4, height: 5, overflow: "hidden" }}>
                <div style={{ width: total ? `${(s.val/total)*100}%` : "0%", height: "100%", background: s.color, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", minWidth: 16, textAlign: "right" }}>{s.val}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ProposalsPage({ proposals, setProposals, clients, setClients, users, tenant, currentUser, setToast, setViewProposal }) {
  const color = tenant?.color || "#E63946";
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selClient, setSelClient] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [apresentacao, setApresentacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientForm, setClientForm] = useState({ name:"", contact:"", email:"", phone:"", notes:"" });
  const fileRef = useRef();

  const mine = currentUser?.role === "admin" ? proposals : proposals.filter(p => p.user_id === currentUser?.id);
  const filtered = mine.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    const c = clients.find(c => c.id === p.client_id);
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase()) && !c?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b) => new Date(b.created_at)-new Date(a.created_at));

  function resetForm() {
    setShowNew(false); setNewTitle(""); setSelClient(""); setPdfFile(null);
    setApresentacao(""); setObservacoes(""); setShowClientForm(false);
    setClientForm({ name:"", contact:"", email:"", phone:"", notes:"" });
  }

  async function handleCreate() {
    if (!newTitle.trim()) { setToast({ msg:"Informe o título.", type:"error" }); return; }
    if (!selClient && !clientForm.name.trim()) { setToast({ msg:"Selecione ou cadastre um cliente.", type:"error" }); return; }
    if (!pdfFile) { setToast({ msg:"Selecione um arquivo PDF.", type:"error" }); return; }
    const tid = currentUser?.tenant_id;
    if (!tid) { setToast({ msg:"Sessão inválida. Faça logout e login novamente.", type:"error" }); return; }
    setSaving(true);
    try {
      let clientId = selClient;
      if (!selClient && clientForm.name.trim()) {
        const { data: nc, error: ce } = await supabase.from("clients").insert([{ name:clientForm.name, contact:clientForm.contact, email:clientForm.email, phone:clientForm.phone, notes:clientForm.notes, tenant_id:tid }]).select().single();
        if (ce) throw new Error("Erro ao criar cliente: " + ce.message);
        setClients(prev => [...prev, nc]);
        clientId = nc.id;
      }
      const token = genToken();
      const filePath = `${tid}/${token}/${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("proposals").upload(filePath, pdfFile, { upsert: true });
      if (upErr) throw new Error("Erro ao enviar PDF: " + upErr.message);
      const { data: { publicUrl } } = supabase.storage.from("proposals").getPublicUrl(filePath);
      const { data: np, error: pe } = await supabase.from("proposals").insert([{ client_id:clientId, user_id:currentUser.id, tenant_id:tid, title:newTitle.trim(), status:"sent", token, access_code:genCode(), pdf_url:publicUrl, apresentacao, observacoes }]).select().single();
      if (pe) throw new Error("Erro ao salvar proposta: " + pe.message);
      await supabase.from("proposal_events").insert([{ proposal_id:np.id, event_type:"sent" }]);
      setProposals(prev => [{ ...np, events:[] }, ...prev]);
      setToast({ msg:"Proposta criada com sucesso!" });
      resetForm();
    } catch(e) {
      setToast({ msg:e.message || "Erro ao criar proposta.", type:"error" });
    }
    setSaving(false);
  }

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A" }}>Propostas</h1>
          <p style={{ color:"#64748B", fontSize:14, marginTop:3 }}>{mine.length} proposta{mine.length!==1?"s":""}</p>
        </div>
        <Btn onClick={() => setShowNew(true)} color={color}>+ Nova Proposta</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {["all","sent","opened","reading","accepted","refused"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filter===f ? color : "#E2E8F0"}`, fontSize:13, cursor:"pointer", fontWeight:filter===f?700:400, background:filter===f?color:"#fff", color:filter===f?"#fff":"#374151", transition:"all 0.15s" }}>
            {f==="all" ? "Todas" : STATUS[f]?.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ marginLeft:"auto", padding:"7px 14px", borderRadius:20, border:"1.5px solid #E2E8F0", fontSize:13, outline:"none", minWidth:200, background:"#fff" }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.length===0 && (
          <Card style={{ textAlign:"center", padding:48, color:"#94A3B8" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Nenhuma proposta encontrada</div>
          </Card>
        )}
        {filtered.map(p => {
          const client = clients.find(c => c.id===p.client_id);
          const owner = users.find(u => u.id===p.user_id);
          const days = Math.floor((Date.now()-new Date(p.created_at))/86400000);
          const isAlert = ["sent","opened"].includes(p.status) && days > 3;
          return (
            <div key={p.id} onClick={() => setViewProposal(p.id)} style={{ background:"#fff", borderRadius:14, padding:"15px 20px", border:`1px solid ${isAlert?"#FDE68A":"#E2E8F0"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:14, position:"relative", transition:"box-shadow 0.15s" }} onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,0.08)"} onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
              {isAlert && <div style={{ position:"absolute", top:10, right:14, fontSize:12, color:"#D97706", fontWeight:600 }}>⚠ {days}d</div>}
              <div style={{ width:42, height:42, borderRadius:10, background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📄</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                <div style={{ fontSize:13, color:"#64748B", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <span>{client?.name||"—"}</span><span>·</span><span>{fmtDate(p.created_at)}</span>
                  {currentUser?.role==="admin" && owner && <span style={{ background:"#F1F5F9", color:"#64748B", fontSize:11, padding:"1px 7px", borderRadius:10 }}>{owner.name?.split(" ")[0]}</span>}
                </div>
              </div>
              <Badge status={p.status} />
            </div>
          );
        })}
      </div>
      {showNew && (
        <Modal title="Nova Proposta" onClose={resetForm} width={520}>
          <Input label="Título da proposta" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: BMS Hospital São Lucas — Rev. 3" />
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Cliente <span style={{ color:"#DC2626" }}>*</span></label>
            <select value={selClient} onChange={e => { setSelClient(e.target.value); if (e.target.value) setShowClientForm(false); }} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", background:"#fff", color:"#0F172A" }}>
              <option value="">Selecionar cliente existente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!selClient && !showClientForm && (
              <button onClick={() => setShowClientForm(true)} style={{ marginTop:8, width:"100%", padding:"8px", border:"1.5px dashed #CBD5E1", borderRadius:8, background:"none", cursor:"pointer", fontSize:13, color:"#64748B" }}>+ Cadastrar novo cliente</button>
            )}
          </div>
          {!selClient && showClientForm && (
            <div style={{ background:"#F8FAFC", borderRadius:10, border:"1px solid #E2E8F0", padding:16, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>Dados do novo cliente</span>
                <button onClick={() => setShowClientForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", fontSize:20, lineHeight:1 }}>×</button>
              </div>
              {[["name","Nome da empresa",true],["contact","Nome do contato",false],["email","E-mail",false],["phone","WhatsApp",false]].map(([k,l,req]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>{l}{req && <span style={{ color:"#DC2626", marginLeft:2 }}>*</span>}</label>
                  <input value={clientForm[k]} onChange={e => setClientForm(f => ({...f,[k]:e.target.value}))} style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #E2E8F0", borderRadius:7, fontSize:13, outline:"none", boxSizing:"border-box" }} />
                </div>
              ))}
            </div>
          )}
          <Input label="Apresentação da proposta" value={apresentacao} onChange={e => setApresentacao(e.target.value)} placeholder="Texto enviado ao cliente via WhatsApp..." rows={3} />
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Observações internas</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Anotações internas (não visíveis para o cliente)..." style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", resize:"vertical", fontFamily:"inherit", background:"#FFFBEB" }} />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>Arquivo PDF <span style={{ color:"#DC2626" }}>*</span></label>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ display:"none" }} />
            <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${pdfFile?"#059669":"#CBD5E1"}`, borderRadius:10, padding:"22px", textAlign:"center", cursor:"pointer", background:pdfFile?"#F0FDF4":"#F8FAFC", transition:"all 0.2s" }}>
              {pdfFile
                ? <span style={{ color:"#059669", fontWeight:600, fontSize:14 }}>✓ {pdfFile.name} ({(pdfFile.size/1024/1024).toFixed(1)} MB)</span>
                : <div><div style={{ fontSize:28, marginBottom:6 }}>📂</div><div style={{ fontSize:14, color:"#64748B" }}>Clique para selecionar o PDF</div><div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>Somente arquivos .pdf</div></div>
              }
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn onClick={resetForm} outline color="#6B7280" disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleCreate} color={color} disabled={saving}>{saving?"Salvando...":"Criar e Gerar Link"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProposalDetail({ proposal, clients, users, tenant, setToast, onBack, setClientViewToken }) {
  const color = tenant?.color || "#E63946";
  const [events, setEvents] = useState([]);
  const client = clients.find(c => c.id===proposal.client_id);
  const owner = users.find(u => u.id===proposal.user_id);
  const link = `${window.location.origin}/p/${proposal.token}`;
  const tmpl = tenant?.wa_template || DEFAULT_WA;
  const waTxt = tmpl.replace("{contato}",client?.contact?.split(" ")[0]||"").replace("{titulo}",proposal.title||"").replace("{link}",link).replace("{senha}",proposal.access_code||"").replace("{apresentacao}",proposal.apresentacao||"");

  useEffect(() => {
    supabase.from("proposal_events").select("*").eq("proposal_id",proposal.id).order("created_at").then(({ data }) => { if (data) setEvents(data); });
  }, [proposal.id]);

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748B", fontSize:14, padding:0, marginBottom:20, display:"flex", alignItems:"center", gap:6 }}>← Voltar às propostas</button>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:14 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#0F172A", marginBottom:6 }}>{proposal.title}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <Badge status={proposal.status} />
            <span style={{ fontSize:13, color:"#64748B" }}>{fmtDate(proposal.created_at)}</span>
            {owner && <span style={{ fontSize:12, background:"#F1F5F9", color:"#64748B", padding:"2px 8px", borderRadius:10 }}>{owner.name}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <a href={`https://wa.me/55${client?.phone?.replace(/\D/g,"")}?text=${encodeURIComponent(waTxt)}`} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", background:"#25D366", color:"#fff", borderRadius:9, fontWeight:600, fontSize:14, textDecoration:"none" }}>WhatsApp</a>
          <Btn onClick={() => { navigator.clipboard?.writeText(link); setToast({ msg:"Link copiado!" }); }} outline color="#2563EB">Copiar Link</Btn>
          <Btn onClick={() => setClientViewToken(proposal.token)} outline color="#7C3AED">Ver como cliente</Btn>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        <Card>
          <div style={{ fontSize:11, color:"#64748B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Cliente</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#0F172A", marginBottom:3 }}>{client?.name||"—"}</div>
          {[client?.contact, client?.email, client?.phone].filter(Boolean).map((v,i) => <div key={i} style={{ fontSize:13, color:"#64748B" }}>{v}</div>)}
        </Card>
        <Card>
          <div style={{ fontSize:11, color:"#64748B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Link e Acesso</div>
          <div style={{ fontSize:12, color:"#2563EB", marginBottom:8, wordBreak:"break-all" }}>{link}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:13, color:"#64748B" }}>Senha:</span>
            <span style={{ background:"#F1F5F9", padding:"3px 10px", borderRadius:6, fontWeight:700, fontFamily:"monospace", fontSize:16, letterSpacing:3 }}>{proposal.access_code}</span>
          </div>
          {proposal.pdf_url && <a href={proposal.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize:13, color:"#2563EB", textDecoration:"none", fontWeight:600 }}>Abrir PDF →</a>}
        </Card>
      </div>
      {(proposal.apresentacao||proposal.observacoes) && (
        <div style={{ display:"grid", gridTemplateColumns:proposal.apresentacao&&proposal.observacoes?"1fr 1fr":"1fr", gap:14, marginBottom:16 }}>
          {proposal.apresentacao && <Card><div style={{ fontSize:11, color:"#64748B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Apresentação</div><p style={{ fontSize:14, color:"#374151", lineHeight:1.6, margin:0 }}>{proposal.apresentacao}</p></Card>}
          {proposal.observacoes && <Card style={{ background:"#FFFBEB", borderColor:"#FDE68A" }}><div style={{ fontSize:11, color:"#92400E", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>🔒 Obs. internas</div><p style={{ fontSize:14, color:"#78350F", lineHeight:1.6, margin:0 }}>{proposal.observacoes}</p></Card>}
        </div>
      )}
      <Card>
        <div style={{ fontSize:11, color:"#64748B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Timeline de eventos</div>
        {events.length===0 && <div style={{ color:"#94A3B8", fontSize:13 }}>Nenhum evento registrado ainda.</div>}
        {events.map((e,i) => (
          <div key={e.id||i} style={{ display:"flex", gap:14, paddingBottom:i<events.length-1?18:0, position:"relative" }}>
            {i<events.length-1 && <div style={{ position:"absolute", left:15, top:32, bottom:0, width:2, background:"#F1F5F9" }} />}
            <div style={{ width:32, height:32, borderRadius:"50%", background:e.event_type==="accepted"?"#ECFDF5":e.event_type==="refused"?"#FEF2F2":"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, border:"2px solid #fff", boxShadow:"0 0 0 2px #E2E8F0" }}>
              {e.event_type==="accepted"?"✓":e.event_type==="refused"?"✕":e.event_type==="opened"?"👁":e.event_type==="read"?"📖":"📤"}
            </div>
            <div style={{ paddingTop:5, flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#0F172A" }}>{EVENT_LABEL[e.event_type]||e.event_type}</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>{fmtDate(e.created_at)}{e.device_type?` · ${e.device_type}`:""}{e.duration_seconds?` · ${fmtSec(e.duration_seconds)}`:""}</div>
              {e.comment_text && <div style={{ marginTop:8, background:"#F8FAFC", borderLeft:`3px solid ${color}`, padding:"8px 12px", borderRadius:"0 8px 8px 0", fontSize:13, color:"#374151", fontStyle:"italic" }}>"{e.comment_text}"</div>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ClientsPage({ clients, setClients, proposals, tenant, currentUser, setToast }) {
  const color = tenant?.color || "#E63946";
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", contact:"", email:"", phone:"", notes:"" });

  function openNew() { setEditingId(null); setForm({ name:"", contact:"", email:"", phone:"", notes:"" }); setShowModal(true); }
  function openEdit(c) { setEditingId(c.id); setForm({ name:c.name||"", contact:c.contact||"", email:c.email||"", phone:c.phone||"", notes:c.notes||"" }); setShowModal(true); }

  async function handleSave() {
    if (!form.name.trim()) { setToast({ msg:"Informe o nome do cliente.", type:"error" }); return; }
    const tid = currentUser?.tenant_id;
    if (!tid) { setToast({ msg:"Sessão inválida. Faça logout e login novamente.", type:"error" }); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { data, error } = await supabase.from("clients").update({ name:form.name, contact:form.contact, email:form.email, phone:form.phone, notes:form.notes }).eq("id",editingId).select().single();
        if (error) throw error;
        setClients(prev => prev.map(c => c.id===editingId ? data : c));
        setToast({ msg:"Cliente atualizado!" });
      } else {
        const { data, error } = await supabase.from("clients").insert([{ ...form, tenant_id:tid }]).select().single();
        if (error) throw error;
        setClients(prev => [...prev, data]);
        setToast({ msg:"Cliente cadastrado!" });
      }
      setShowModal(false);
    } catch(e) { setToast({ msg:"Erro: "+e.message, type:"error" }); }
    setSaving(false);
  }

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div><h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A" }}>Clientes</h1><p style={{ color:"#64748B", fontSize:14, marginTop:3 }}>{clients.length} clientes</p></div>
        <Btn onClick={openNew} color={color}>+ Novo Cliente</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {clients.length===0 && <Card style={{ textAlign:"center", padding:48, color:"#94A3B8" }}><div style={{ fontSize:36, marginBottom:10 }}>👥</div><div style={{ fontSize:15, fontWeight:600 }}>Nenhum cliente cadastrado</div></Card>}
        {clients.map(c => {
          const cPs = proposals.filter(p => p.client_id===c.id);
          const acc = cPs.filter(p => p.status==="accepted").length;
          return (
            <Card key={c.id} style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, color, flexShrink:0 }}>{c.name?.charAt(0).toUpperCase()}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{c.name}</div>
                <div style={{ fontSize:13, color:"#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{[c.contact,c.email,c.phone].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{cPs.length} proposta{cPs.length!==1?"s":""}</div>
                  <div style={{ fontSize:12, color:"#059669", fontWeight:600 }}>{acc} aceita{acc!==1?"s":""}</div>
                </div>
                <Btn onClick={() => openEdit(c)} outline color="#64748B" size="sm">Editar</Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {showModal && (
        <Modal title={editingId?"Editar Cliente":"Novo Cliente"} onClose={() => setShowModal(false)}>
          {[["name","Nome da empresa",true],["contact","Nome do contato",false],["email","E-mail",false],["phone","WhatsApp",false],["notes","Observações",false]].map(([k,l,req]) => (
            <Input key={k} label={l} required={req} value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} />
          ))}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
            <Btn onClick={() => setShowModal(false)} outline color="#6B7280" disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleSave} color={color} disabled={saving}>{saving?"Salvando...":editingId?"Salvar alterações":"Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UsersPage({ users, setUsers, tenant, currentUser, setToast }) {
  const color = tenant?.color || "#E63946";
  const myUsers = users.filter(u => u.tenant_id===currentUser?.tenant_id);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", role:"vendedor" });

  function openEdit(u) { setEditingId(u.id); setForm({ name:u.name||"", role:u.role||"vendedor" }); setShowModal(true); }

  async function handleSave() {
    if (!form.name.trim()) { setToast({ msg:"Informe o nome.", type:"error" }); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("users").update({ name:form.name, role:form.role }).eq("id",editingId).select().single();
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id===editingId ? { ...u, ...data } : u));
      setToast({ msg:"Usuário atualizado!" });
      setShowModal(false);
    } catch(e) { setToast({ msg:"Erro: "+e.message, type:"error" }); }
    setSaving(false);
  }

  async function toggleRole(u) {
    if (u.id===currentUser?.id) { setToast({ msg:"Não é possível alterar sua própria função.", type:"error" }); return; }
    const role = u.role==="admin" ? "vendedor" : "admin";
    const { error } = await supabase.from("users").update({ role }).eq("id",u.id);
    if (!error) setUsers(prev => prev.map(x => x.id===u.id ? { ...x, role } : x));
    else setToast({ msg:"Erro ao atualizar.", type:"error" });
  }

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div><h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A" }}>Usuários</h1><p style={{ color:"#64748B", fontSize:14, marginTop:3 }}>{myUsers.length} usuários</p></div>
      </div>
      <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#1E40AF" }}>
        Para criar novos usuários: acesse <strong>Authentication → Users</strong> no Supabase → crie o usuário com e-mail e senha → copie o UUID e insira na tabela <strong>users</strong> via SQL Editor.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {myUsers.map(u => (
          <Card key={u.id} style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:u.role==="admin"?color:"#E2E8F0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:17, color:u.role==="admin"?"#fff":"#64748B", flexShrink:0 }}>{u.name?.charAt(0).toUpperCase()}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{u.name}</span>
                {u.id===currentUser?.id && <span style={{ fontSize:11, color:"#64748B", background:"#F1F5F9", padding:"2px 8px", borderRadius:10 }}>você</span>}
              </div>
              <div style={{ fontSize:13, color:"#64748B" }}>{u.email}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={() => toggleRole(u)} disabled={u.id===currentUser?.id} style={{ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${u.role==="admin"?color:"#E2E8F0"}`, fontSize:12, fontWeight:700, cursor:u.id===currentUser?.id?"not-allowed":"pointer", background:u.role==="admin"?color+"15":"#F1F5F9", color:u.role==="admin"?color:"#64748B", opacity:u.id===currentUser?.id?0.5:1 }}>
                {u.role==="admin"?"Admin":"Vendedor"}
              </button>
              <Btn onClick={() => openEdit(u)} outline color="#64748B" size="sm">Editar</Btn>
            </div>
          </Card>
        ))}
      </div>
      {showModal && (
        <Modal title="Editar Usuário" onClose={() => setShowModal(false)}>
          <Input label="Nome completo" required value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Função</label>
            <div style={{ display:"flex", gap:10 }}>
              {["vendedor","admin"].map(r => (
                <button key={r} onClick={() => setForm(f => ({...f,role:r}))} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`2px solid ${form.role===r?color:"#E2E8F0"}`, cursor:"pointer", fontSize:14, fontWeight:700, background:form.role===r?color:"#fff", color:form.role===r?"#fff":"#374151", transition:"all 0.15s" }}>
                  {r==="admin"?"Admin":"Vendedor"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn onClick={() => setShowModal(false)} outline color="#6B7280" disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleSave} color={color} disabled={saving}>{saving?"Salvando...":"Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettingsPage({ tenant, setTenant, currentUser, setToast }) {
  const [form, setForm] = useState({ name:tenant?.name||"", logo:tenant?.logo||"", color:tenant?.color||"#E63946", email:tenant?.email||"", wa_template:tenant?.wa_template||DEFAULT_WA });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const tid = currentUser?.tenant_id;
    if (!tid) { setToast({ msg:"Sessão inválida.", type:"error" }); return; }
    setSaving(true);
    const { error } = await supabase.from("tenants").update({ name:form.name, logo:form.logo, color:form.color, email:form.email, wa_template:form.wa_template }).eq("id",tid);
    if (error) { setToast({ msg:"Erro ao salvar: "+error.message, type:"error" }); }
    else { setTenant({ ...tenant, ...form }); setToast({ msg:"Configurações salvas!" }); }
    setSaving(false);
  }

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <h1 style={{ fontSize:24, fontWeight:800, color:"#0F172A", marginBottom:24 }}>Configurações</h1>
      <Card style={{ maxWidth:560 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:20 }}>Identidade Visual (White Label)</div>
        <Input label="Nome da empresa" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
        <Input label="E-mail do remetente" value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} type="email" />
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Cor primária</label>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <input type="color" value={form.color} onChange={e => setForm(f => ({...f,color:e.target.value}))} style={{ width:46, height:38, border:"1.5px solid #E2E8F0", borderRadius:8, cursor:"pointer", padding:2 }} />
            <input value={form.color} onChange={e => setForm(f => ({...f,color:e.target.value}))} style={{ padding:"9px 13px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", width:130, fontFamily:"monospace" }} />
            <div style={{ width:38, height:38, borderRadius:8, background:form.color, border:"1px solid #E2E8F0" }} />
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Símbolo / Inicial</label>
          <input value={form.logo} maxLength={1} onChange={e => setForm(f => ({...f,logo:e.target.value.charAt(0)}))} style={{ width:56, padding:"10px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:22, fontWeight:800, outline:"none", textAlign:"center" }} />
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Mensagem padrão do WhatsApp</label>
          <textarea value={form.wa_template} onChange={e => setForm(f => ({...f,wa_template:e.target.value}))} rows={7} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, outline:"none", resize:"vertical", fontFamily:"monospace", lineHeight:1.6 }} />
          <div style={{ marginTop:6, fontSize:12, color:"#64748B", lineHeight:1.8 }}>
            Variáveis: {["{contato}","{titulo}","{link}","{senha}","{apresentacao}"].map(v => <code key={v} style={{ background:"#F1F5F9", padding:"1px 6px", borderRadius:4, marginRight:4 }}>{v}</code>)}
          </div>
        </div>
        <Btn onClick={handleSave} color={form.color} disabled={saving} size="lg">{saving?"Salvando...":"Salvar alterações"}</Btn>
      </Card>
    </div>
  );
}

function ClientView({ token, onBack }) {
  const [proposal, setProposal] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [timeRead, setTimeRead] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    supabase.from("proposals").select("*").eq("token",token).single().then(({ data }) => {
      if (data) {
        setProposal(data);
        if (["accepted","refused"].includes(data.status)) setDecision(data.status);
        supabase.from("clients").select("*").eq("id",data.client_id).single().then(({ data:cd }) => setClient(cd));
        supabase.from("tenants").select("*").eq("id",data.tenant_id).single().then(({ data:td }) => setTenant(td));
      }
      setLoading(false);
    });
  }, [token]);

  function handleUnlock() {
    if (code===proposal?.access_code) {
      setUnlocked(true); setError("");
      supabase.from("proposal_events").insert([{ proposal_id:proposal.id, event_type:"opened", device_type:window.innerWidth<768?"mobile":"desktop" }]);
      supabase.from("proposals").update({ status:"opened" }).eq("id",proposal.id);
      timerRef.current = setInterval(() => setTimeRead(t => t+1), 1000);
    } else { setError("Senha incorreta. Verifique com seu contato."); }
  }

  async function handleDecision(type) {
    if (type==="refused" && !comment.trim()) return;
    clearInterval(timerRef.current);
    await supabase.from("proposal_events").insert([{ proposal_id:proposal.id, event_type:type, comment_text:comment, duration_seconds:timeRead }]);
    await supabase.from("proposals").update({ status:type }).eq("id",proposal.id);
    setDecision(type); setShowModal(null);
  }

  const color = tenant?.color || "#E63946";
  if (loading) return <Loading text="Carregando proposta..." />;
  if (!proposal) return <div style={{ textAlign:"center", padding:80, color:"#94A3B8", fontSize:16 }}>Proposta não encontrada.</div>;

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"14px 28px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:16 }}>{tenant?.logo||"P"}</div>
        <div>
          <div style={{ fontWeight:700, color:"#0F172A", fontSize:15 }}>{tenant?.name}</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Proposta Comercial</div>
        </div>
        {onBack && <button onClick={onBack} style={{ marginLeft:"auto", background:"none", border:"1px solid #E2E8F0", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, color:"#64748B" }}>← Voltar</button>}
      </div>
      {!unlocked ? (
        <div style={{ maxWidth:400, margin:"80px auto", background:"#fff", borderRadius:16, padding:40, boxShadow:"0 4px 32px rgba(0,0,0,0.08)", border:"1px solid #E2E8F0", textAlign:"center" }}>
          <div style={{ fontSize:42, marginBottom:14 }}>🔐</div>
          <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", marginBottom:8 }}>Acesso à Proposta</h2>
          <p style={{ color:"#64748B", fontSize:14, marginBottom:24 }}>Digite o código de acesso enviado pelo WhatsApp</p>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key==="Enter" && handleUnlock()} placeholder="000000" maxLength={6} style={{ width:"100%", padding:14, border:`2px solid ${error?"#DC2626":"#E2E8F0"}`, borderRadius:10, fontSize:30, fontWeight:800, textAlign:"center", letterSpacing:10, outline:"none", boxSizing:"border-box", fontFamily:"monospace", marginBottom:12 }} />
          {error && <div style={{ color:"#DC2626", fontSize:13, marginBottom:12 }}>{error}</div>}
          <button onClick={handleUnlock} style={{ width:"100%", background:color, color:"#fff", border:"none", borderRadius:10, padding:14, fontWeight:700, fontSize:16, cursor:"pointer" }}>Acessar Proposta</button>
        </div>
      ) : (
        <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 20px" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:26, border:"1px solid #E2E8F0", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Proposta para</div>
                <h1 style={{ fontSize:22, fontWeight:800, color:"#0F172A", marginBottom:4 }}>{client?.name}</h1>
                <div style={{ fontSize:14, color:"#64748B" }}>{proposal.title}</div>
                {proposal.apresentacao && <div style={{ marginTop:12, padding:"12px 16px", background:"#F8FAFC", borderRadius:8, borderLeft:`3px solid ${color}`, fontSize:14, color:"#374151", lineHeight:1.6 }}>{proposal.apresentacao}</div>}
              </div>
              {proposal.pdf_url && <a href={proposal.pdf_url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", background:"#F8FAFC", color:"#374151", border:"1px solid #E2E8F0", borderRadius:9, fontWeight:600, fontSize:14, textDecoration:"none" }}>Baixar / Imprimir</a>}
            </div>
            <div style={{ marginTop:10, fontSize:12, color:"#94A3B8" }}>Tempo de leitura: {timeRead}s</div>
          </div>
          {proposal.pdf_url && (
            <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E2E8F0", marginBottom:16, overflow:"hidden" }}>
              <iframe src={proposal.pdf_url} width="100%" height="600" style={{ border:"none", display:"block" }} title="Proposta PDF" />
            </div>
          )}
          {!decision && (
            <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #E2E8F0", display:"flex", gap:12, alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:14, color:"#64748B" }}>Qual é a sua decisão?</span>
              <button onClick={() => setShowModal("accepted")} style={{ padding:"12px 24px", background:"#059669", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:15, cursor:"pointer" }}>Aceitar Proposta</button>
              <button onClick={() => setShowModal("refused")} style={{ padding:"12px 24px", background:"#fff", color:"#DC2626", border:"2px solid #DC2626", borderRadius:10, fontWeight:700, fontSize:15, cursor:"pointer" }}>Recusar Proposta</button>
            </div>
          )}
          {decision && (
            <div style={{ background:decision==="accepted"?"#ECFDF5":"#FEF2F2", borderRadius:16, padding:24, border:`1px solid ${decision==="accepted"?"#A7F3D0":"#FECACA"}`, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>{decision==="accepted"?"🎉":"😔"}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#0F172A" }}>{decision==="accepted"?"Proposta aceita!":"Proposta recusada"}</div>
              <div style={{ fontSize:14, color:"#64748B", marginTop:6 }}>Sua resposta foi registrada. Entraremos em contato em breve.</div>
            </div>
          )}
        </div>
      )}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:32, width:440, maxWidth:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize:19, fontWeight:700, color:"#0F172A", marginBottom:8 }}>{showModal==="accepted"?"Aceitar proposta":"Recusar proposta"}</h2>
            <p style={{ color:"#64748B", fontSize:14, marginBottom:18 }}>{showModal==="accepted"?"Comentário opcional para o vendedor.":"Informe o motivo da recusa."}</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder={showModal==="accepted"?"Comentário opcional...":"Motivo da recusa (obrigatório)..."} style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:14, outline:"none", resize:"vertical", fontFamily:"inherit", marginBottom:18, boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn onClick={() => setShowModal(null)} outline color="#6B7280">Cancelar</Btn>
              <Btn onClick={() => handleDecision(showModal)} color={showModal==="accepted"?"#059669":"#DC2626"} disabled={showModal==="refused"&&!comment.trim()}>Confirmar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!email.trim()||!pass.trim()) { setErr("Preencha e-mail e senha."); return; }
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email:email.trim(), password:pass });
      if (error) throw error;
      const { data:userData, error:ue } = await supabase.from("users").select("*").eq("id",data.user.id).single();
      if (ue||!userData) throw new Error("Usuário não encontrado. Verifique se foi inserido na tabela users.");
      const { data:tenantData } = await supabase.from("tenants").select("*").eq("id",userData.tenant_id).single();
      onLogin(tenantData||{}, { ...userData, email:data.user.email, tenant_id:userData.tenant_id });
    } catch(e) {
      setErr(e.message==="Invalid login credentials"?"E-mail ou senha inválidos.":e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:400, background:"#fff", borderRadius:20, padding:40, boxShadow:"0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:38, marginBottom:8 }}>📋</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#0F172A", marginBottom:4 }}>Proposta+</h1>
          <p style={{ color:"#64748B", fontSize:14 }}>Gestão e envio de propostas comerciais</p>
        </div>
        <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com" />
        <Input label="Senha" value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" />
        {err && <div style={{ color:"#DC2626", fontSize:13, marginBottom:12, padding:"8px 12px", background:"#FEF2F2", borderRadius:8 }}>{err}</div>}
        <button onClick={handle} disabled={loading} style={{ width:"100%", background:loading?"#94A3B8":"#E63946", color:"#fff", border:"none", borderRadius:10, padding:14, fontWeight:700, fontSize:16, cursor:loading?"not-allowed":"pointer", marginTop:4 }}>
          {loading?"Entrando...":"Entrar"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tenant, setTenant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [toast, setToastState] = useState(null);
  const [viewProposalId, setViewProposalId] = useState(null);
  const [clientViewToken, setClientViewToken] = useState(null);
  const [booting, setBooting] = useState(true);

  function setToast(t) { setToastState(t); setTimeout(() => setToastState(null), 4500); }

  const urlToken = window.location.pathname.startsWith("/p/") ? window.location.pathname.split("/p/")[1] : null;

  async function loadData(user) {
    const tid = user.tenant_id;
    if (!tid) return;
    const [{ data:cs }, { data:ps }, { data:us }] = await Promise.all([
      supabase.from("clients").select("*").eq("tenant_id",tid),
      supabase.from("proposals").select("*").eq("tenant_id",tid).order("created_at",{ ascending:false }),
      supabase.from("users").select("*").eq("tenant_id",tid),
    ]);
    if (cs) setClients(cs);
    if (ps) setProposals(ps);
    if (us) setUsers(us);
  }

  useEffect(() => {
    if (urlToken) { setBooting(false); return; }
    supabase.auth.getSession().then(async ({ data:{ session } }) => {
      if (session) {
        const { data:userData } = await supabase.from("users").select("*").eq("id",session.user.id).single();
        if (userData) {
          const { data:tenantData } = await supabase.from("tenants").select("*").eq("id",userData.tenant_id).single();
          const user = { ...userData, email:session.user.email, tenant_id:userData.tenant_id };
          setCurrentUser(user);
          setTenant(tenantData||{});
          await loadData(user);
        }
      }
      setBooting(false);
    });
  }, []);

  async function handleLogin(t, u) { setTenant(t); setCurrentUser(u); await loadData(u); }

  async function handleLogout() {
    await supabase.auth.signOut();
    setTenant(null); setCurrentUser(null); setUsers([]); setProposals([]); setClients([]); setPage("dashboard");
  }

  if (urlToken) return <><GlobalStyle /><ClientView token={urlToken} /></>;
  if (booting) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F1F5F9" }}><Loading text="Iniciando Proposta+..." /></div>;
  if (!currentUser) return <><GlobalStyle /><Login onLogin={handleLogin} /></>;
  if (clientViewToken) return <><GlobalStyle /><ClientView token={clientViewToken} onBack={() => setClientViewToken(null)} /></>;

  const viewProposal = viewProposalId ? proposals.find(p => p.id===viewProposalId) : null;

  return (
    <>
      <GlobalStyle />
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar page={page} setPage={p => { setPage(p); setViewProposalId(null); }} tenant={tenant} currentUser={currentUser} onLogout={handleLogout} />
        <main style={{ marginLeft:220, flex:1, padding:"30px 34px", minHeight:"100vh" }}>
          {page==="dashboard" && <Dashboard proposals={proposals} clients={clients} tenant={tenant} currentUser={currentUser} setPage={setPage} />}
          {page==="proposals" && !viewProposal && <ProposalsPage proposals={proposals} setProposals={setProposals} clients={clients} setClients={setClients} users={users} tenant={tenant} currentUser={currentUser} setToast={setToast} setViewProposal={setViewProposalId} />}
          {page==="proposals" && viewProposal && <ProposalDetail proposal={viewProposal} clients={clients} users={users} tenant={tenant} setToast={setToast} onBack={() => setViewProposalId(null)} setClientViewToken={setClientViewToken} />}
          {page==="clients" && <ClientsPage clients={clients} setClients={setClients} proposals={proposals} tenant={tenant} currentUser={currentUser} setToast={setToast} />}
          {page==="users" && currentUser?.role==="admin" && <UsersPage users={users} setUsers={setUsers} tenant={tenant} currentUser={currentUser} setToast={setToast} />}
          {page==="settings" && <SettingsPage tenant={tenant} setTenant={setTenant} currentUser={currentUser} setToast={setToast} />}
        </main>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToastState(null)} />}
    </>
  );
}
