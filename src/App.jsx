import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const DEFAULT_WA_TEMPLATE = "Olá {contato}! Segue o link da proposta comercial que preparamos para vocês.\n\n📄 *{titulo}*\n🔗 https://{link}\n🔑 Senha de acesso: {senha}\n\n{apresentacao}\n\nQualquer dúvida estou à disposição. Abraço!";

const MOCK_TENANTS = {
  staefa: { name: "Staefa Control System", color: "#E63946", logo: "S", email: "rodrigo@staefa.com.br", waTemplate: DEFAULT_WA_TEMPLATE },
  halten: { name: "Halten Tecnologia", color: "#1D3557", logo: "H", email: "rodrigo@halten.com.br", waTemplate: DEFAULT_WA_TEMPLATE },
};

const MOCK_USERS = [
  { id: "u001", tenantKey: "staefa", name: "Rodrigo Pacheco", email: "rodrigo@staefa.com.br", password: "123456", role: "admin" },
  { id: "u002", tenantKey: "staefa", name: "Carlos Vendas", email: "carlos@staefa.com.br", password: "123456", role: "vendedor" },
  { id: "u003", tenantKey: "staefa", name: "Ana Silva", email: "ana@staefa.com.br", password: "123456", role: "vendedor" },
  { id: "u004", tenantKey: "halten", name: "Rodrigo Pacheco", email: "rodrigo@halten.com.br", password: "123456", role: "admin" },
  { id: "u005", tenantKey: "halten", name: "Paulo Santos", email: "paulo@halten.com.br", password: "123456", role: "vendedor" },
];

const initialProposals = [
  {
    id: "p001", token: "abc123", clientId: "c001", userId: "u001", title: "BMS Hospital São Lucas — Rev. 1",
    status: "accepted", createdAt: "2026-05-01T09:00:00", accessCode: "847291",
    events: [
      { type: "sent", at: "2026-05-01T09:00:00" },
      { type: "opened", at: "2026-05-01T14:23:00", device: "mobile" },
      { type: "read", at: "2026-05-01T14:25:00", duration: 187 },
      { type: "accepted", at: "2026-05-02T10:11:00", comment: "Aprovado pela diretoria. Podem prosseguir." },
    ],
  },
  {
    id: "p002", token: "def456", clientId: "c002", userId: "u002", title: "Automação Predial — Proposta Inicial",
    status: "opened", createdAt: "2026-05-08T11:30:00", accessCode: "332198",
    events: [
      { type: "sent", at: "2026-05-08T11:30:00" },
      { type: "opened", at: "2026-05-09T08:45:00", device: "desktop" },
    ],
  },
  {
    id: "p003", token: "ghi789", clientId: "c001", userId: "u001", title: "BMS Hospital São Lucas — Rev. 2",
    status: "sent", createdAt: "2026-05-12T16:00:00", accessCode: "910274",
    events: [{ type: "sent", at: "2026-05-12T16:00:00" }],
  },
  {
    id: "p004", token: "jkl012", clientId: "c003", userId: "u002", title: "Controle de Acesso — Sede",
    status: "refused", createdAt: "2026-04-20T10:00:00", accessCode: "553847",
    events: [
      { type: "sent", at: "2026-04-20T10:00:00" },
      { type: "opened", at: "2026-04-21T09:00:00", device: "desktop" },
      { type: "read", at: "2026-04-21T09:03:00", duration: 95 },
      { type: "refused", at: "2026-04-22T14:00:00", comment: "Orçamento acima do previsto para este ano." },
    ],
  },
  {
    id: "p005", token: "mno345", clientId: "c003", userId: "u003", title: "Controle de Acesso — Sede Rev. 2",
    status: "reading", createdAt: "2026-05-14T09:00:00", accessCode: "774412",
    events: [
      { type: "sent", at: "2026-05-14T09:00:00" },
      { type: "opened", at: "2026-05-14T15:00:00", device: "mobile" },
      { type: "read", at: "2026-05-14T15:01:00", duration: 312 },
    ],
  },
];

const initialClients = [
  { id: "c001", name: "Hospital São Lucas", contact: "Dr. Marcos Ferreira", email: "marcos@saolucas.com.br", phone: "11999001122" },
  { id: "c002", name: "Grupo Patrimonial Nobre", contact: "Ana Beatriz Lima", email: "ana@grnobre.com.br", phone: "11988334455" },
  { id: "c003", name: "TechPark Industrias", contact: "Carlos Mendonça", email: "carlos@techpark.com.br", phone: "11977665544" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  sent:     { label: "Enviada",     color: "#6B7280", bg: "#F3F4F6" },
  opened:   { label: "Aberta",      color: "#2563EB", bg: "#EFF6FF" },
  reading:  { label: "Em análise",  color: "#D97706", bg: "#FFFBEB" },
  read:     { label: "Lida",        color: "#7C3AED", bg: "#F5F3FF" },
  accepted: { label: "Aceita",      color: "#059669", bg: "#ECFDF5" },
  refused:  { label: "Recusada",    color: "#DC2626", bg: "#FEF2F2" },
};

const EVENT_LABELS = {
  sent: "Proposta enviada",
  opened: "Proposta aberta",
  read: "Proposta lida",
  reading: "Em análise",
  accepted: "Proposta aceita",
  refused: "Proposta recusada",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(s) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min ${s % 60}s`;
}
function genToken() { return Math.random().toString(36).substring(2, 9); }
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, background: "#111827", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 9999, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", animation: "slideUp 0.3s ease" }}>
      <span>✓</span> {msg}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
      {c.label}
    </span>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, tenant, currentUser, onLogout }) {
  const nav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "proposals", icon: "📄", label: "Propostas" },
    { id: "clients", icon: "👥", label: "Clientes" },
    ...(currentUser.role === "admin" ? [{ id: "users", icon: "👤", label: "Usuários" }] : []),
    { id: "settings", icon: "⚙", label: "Configurações" },
  ];
  return (
    <div style={{ width: 220, background: "#0F172A", display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: tenant.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 16 }}>{tenant.logo}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{tenant.name.split(" ")[0]}</div>
            <div style={{ color: "#64748B", fontSize: 11 }}>Proposta+</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: page === n.id ? tenant.color + "22" : "transparent", color: page === n.id ? "#fff" : "#94A3B8", fontSize: 14, fontWeight: page === n.id ? 600 : 400, marginBottom: 2, transition: "all 0.15s", textAlign: "left" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
            {page === n.id && <div style={{ marginLeft: "auto", width: 3, height: 16, borderRadius: 2, background: tenant.color }} />}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 10px", borderTop: "1px solid #1E293B" }}>
        <div style={{ padding: "8px 12px", marginBottom: 4 }}>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ fontSize: 10, background: currentUser.role === "admin" ? tenant.color : "#334155", color: "#fff", padding: "2px 7px", borderRadius: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {currentUser.role === "admin" ? "Admin" : "Vendedor"}
            </span>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#64748B", fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
          <span>↩</span> Sair
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ proposals, clients, tenant, currentUser, setPage }) {
  const visibleProposals = currentUser.role === "admin" ? proposals : proposals.filter(p => p.userId === currentUser.id);
  const proposals2 = visibleProposals;
  const total = proposals2.length;
  const opened = proposals2.filter(p => ["opened","reading","read","accepted","refused"].includes(p.status)).length;
  const accepted = proposals2.filter(p => p.status === "accepted").length;
  const refused = proposals2.filter(p => p.status === "refused").length;
  const pending = proposals2.filter(p => ["sent","opened","reading"].includes(p.status)).length;
  const openRate = total ? Math.round((opened / total) * 100) : 0;
  const convRate = opened ? Math.round((accepted / opened) * 100) : 0;

  const alerts = proposals2.filter(p => {
    if (!["sent","opened"].includes(p.status)) return false;
    const days = (Date.now() - new Date(p.createdAt)) / 86400000;
    return days > 3;
  });

  const recentEvents = proposals2.flatMap(p =>
    p.events.map(e => ({ ...e, proposalTitle: p.title, clientName: clients.find(c => c.id === p.clientId)?.name }))
  ).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);

  const weeklyData = [3, 5, 2, 7, 4, 6, 3, proposals2.filter(p => new Date(p.createdAt) > new Date(Date.now() - 7 * 86400000)).length];
  const maxW = Math.max(...weeklyData);

  const statusDist = [
    { label: "Aceitas", val: accepted, color: "#059669" },
    { label: "Recusadas", val: refused, color: "#DC2626" },
    { label: "Abertas", val: opened - accepted - refused, color: "#2563EB" },
    { label: "Enviadas", val: proposals2.filter(p => p.status === "sent").length, color: "#6B7280" },
  ];

  const Card = ({ label, value, sub, accent }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #E2E8F0", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: accent || "#0F172A", fontFamily: "'DM Serif Display', Georgia, serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>Dashboard</h1>
        <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 14 }}>Visão geral das suas propostas comerciais</p>
      </div>

      {alerts.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 14, color: "#92400E" }}><strong>{alerts.length} proposta{alerts.length > 1 ? "s" : ""}</strong> sem resposta há mais de 3 dias. <button onClick={() => setPage("proposals")} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", fontWeight: 600, fontSize: 14, padding: 0 }}>Ver propostas →</button></span>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Card label="Total de Propostas" value={total} sub="Todas as empresas" />
        <Card label="Taxa de Abertura" value={`${openRate}%`} sub={`${opened} de ${total} abertas`} accent={tenant.color} />
        <Card label="Taxa de Conversão" value={`${convRate}%`} sub={`${accepted} aceitas`} accent="#059669" />
        <Card label="Aguardando Resposta" value={pending} sub="Enviadas ou em análise" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Gráfico de barras */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Propostas por Semana</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {weeklyData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: maxW ? `${(v / maxW) * 80}px` : "4px", background: i === weeklyData.length - 1 ? tenant.color : "#E2E8F0", borderRadius: "4px 4px 0 0", transition: "height 0.5s ease", minHeight: 4 }} />
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{i === weeklyData.length - 1 ? "Essa" : `S${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de status */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Distribuição de Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statusDist.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{s.label}</span>
                <div style={{ flex: 2, background: "#F1F5F9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ width: total ? `${(s.val / total) * 100}%` : "0%", height: "100%", background: s.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", width: 20, textAlign: "right" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feed de atividade */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Atividade Recente</div>
        {recentEvents.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < recentEvents.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: e.type === "accepted" ? "#ECFDF5" : e.type === "refused" ? "#FEF2F2" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {e.type === "accepted" ? "✓" : e.type === "refused" ? "✗" : e.type === "opened" ? "👁" : e.type === "read" ? "📖" : "📤"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#0F172A" }}><strong>{e.clientName}</strong> — {EVENT_LABELS[e.type] || e.type}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{e.proposalTitle} · {fmtDate(e.at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROPOSALS PAGE ───────────────────────────────────────────────────────────
function ProposalsPage({ proposals, setProposals, clients, setClients, tenant, currentUser, users, setToast, setPage, setViewProposal }) {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selClient, setSelClient] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [fakePdf, setFakePdf] = useState(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", contact: "", email: "", phone: "", notes: "" });
  const [propApresentacao, setPropApresentacao] = useState("");
  const [propObservacoes, setPropObservacoes] = useState("");

  const visibleProposals = currentUser.role === "admin" ? proposals : proposals.filter(p => p.userId === currentUser.id);
  const filtered = visibleProposals.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    const c = clients.find(c => c.id === p.clientId);
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !c?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function handleCloseNew() {
    setShowNew(false);
    setNewTitle(""); setSelClient(""); setFakePdf(null);
    setShowNewClientForm(false);
    setNewClientForm({ name: "", contact: "", email: "", phone: "", notes: "" });
    setPropApresentacao(""); setPropObservacoes("");
  }

  function handleCreate() {
    if (!newTitle || (!selClient && !newClientForm.name)) return;
    let clientId = selClient;
    if (!selClient && newClientForm.name) {
      const nc = { id: "c" + Date.now(), ...newClientForm };
      setClients(prev => [...prev, nc]);
      clientId = nc.id;
    }
    const np = {
      id: "p" + Date.now(), token: genToken(), clientId,
      userId: currentUser.id,
      title: newTitle, status: "sent",
      apresentacao: propApresentacao,
      observacoes: propObservacoes,
      createdAt: new Date().toISOString(), accessCode: genCode(),
      events: [{ type: "sent", at: new Date().toISOString() }],
    };
    setProposals(prev => [np, ...prev]);
    handleCloseNew();
    setToast("Proposta criada! Link gerado com sucesso.");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>Propostas</h1>
          <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 14 }}>{proposals.length} proposta{proposals.length !== 1 ? "s" : ""} cadastrada{proposals.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ background: tenant.color, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          + Nova Proposta
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all","sent","opened","reading","accepted","refused"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", fontSize: 13, cursor: "pointer", fontWeight: filter === f ? 700 : 400, background: filter === f ? tenant.color : "#fff", color: filter === f ? "#fff" : "#374151", borderColor: filter === f ? tenant.color : "#E2E8F0" }}>
            {f === "all" ? "Todas" : STATUS_CONFIG[f]?.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou cliente..." style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 20, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", minWidth: 220 }} />
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma proposta encontrada</div>
          </div>
        )}
        {filtered.map(p => {
          const client = clients.find(c => c.id === p.clientId);
          const lastEvent = p.events[p.events.length - 1];
          const readEvent = p.events.find(e => e.type === "read");
          const daysSince = Math.floor((Date.now() - new Date(p.createdAt)) / 86400000);
          const isAlert = ["sent","opened"].includes(p.status) && daysSince > 3;
          return (
            <div key={p.id} onClick={() => setViewProposal(p.id)} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: `1px solid ${isAlert ? "#FDE68A" : "#E2E8F0"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "box-shadow 0.15s", position: "relative" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              {isAlert && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 12, color: "#D97706" }}>⚠ {daysSince}d sem resposta</div>}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>
                {client?.name} · Enviada em {fmtDate(p.createdAt)}
                {currentUser.role === "admin" && (() => { const u = users.find(u => u.id === p.userId); return u ? <span style={{ marginLeft: 8, fontSize: 11, background: "#F1F5F9", color: "#64748B", padding: "2px 7px", borderRadius: 10 }}>👤 {u.name.split(" ")[0]}</span> : null; })()}
              </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <Badge status={p.status} />
                {readEvent && <span style={{ fontSize: 12, color: "#94A3B8" }}>Lida por {fmtDuration(readEvent.duration)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nova proposta */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Serif Display', Georgia, serif" }}>Nova Proposta</h2>

            {/* Título */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Título da proposta *</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: BMS Hospital São Lucas — Rev. 3" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Cliente */}
            <div style={{ marginBottom: showNewClientForm ? 0 : 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Cliente *</label>
              <select value={selClient} onChange={e => { setSelClient(e.target.value); if (e.target.value) setShowNewClientForm(false); }}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff" }}>
                <option value="">Selecionar cliente existente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Botão novo cliente */}
            {!selClient && !showNewClientForm && (
              <button onClick={() => setShowNewClientForm(true)}
                style={{ marginTop: 8, marginBottom: 16, background: "none", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#64748B", width: "100%", textAlign: "center" }}>
                + Cadastrar novo cliente
              </button>
            )}

            {/* Formulário novo cliente inline */}
            {!selClient && showNewClientForm && (
              <div style={{ marginTop: 12, marginBottom: 16, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0", padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>📋 Dados do novo cliente</span>
                  <button onClick={() => setShowNewClientForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>×</button>
                </div>
                {[
                  ["name", "Nome da empresa *", "Ex: Hospital São Lucas"],
                  ["contact", "Nome do contato", "Ex: Dr. Marcos Ferreira"],
                  ["email", "E-mail", "contato@empresa.com.br"],
                  ["phone", "WhatsApp", "11999001122"],
                  ["notes", "Observações", "Informações adicionais..."],
                ].map(([k, l, ph]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{l}</label>
                    {k === "notes"
                      ? <textarea value={newClientForm[k]} onChange={e => setNewClientForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} rows={2}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                      : <input value={newClientForm[k]} onChange={e => setNewClientForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    }
                  </div>
                ))}
              </div>
            )}

            {/* Apresentação */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Apresentação da proposta</label>
              <textarea value={propApresentacao} onChange={e => setPropApresentacao(e.target.value)} rows={3}
                placeholder="Breve texto enviado ao cliente. Ex: Conforme conversado, segue nossa proposta para automação predial..."
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Aparece na mensagem do WhatsApp e na página do cliente.</div>
            </div>
            {/* Observações internas */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Observações internas</label>
              <textarea value={propObservacoes} onChange={e => setPropObservacoes(e.target.value)} rows={2}
                placeholder="Anotações internas sobre esta proposta (não visíveis para o cliente)..."
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", background: "#FFFBEB" }} />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>🔒 Apenas visível para você no painel.</div>
            </div>
            {/* PDF */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Arquivo PDF *</label>
              <div onClick={() => setFakePdf("proposta.pdf")} style={{ border: "2px dashed #E2E8F0", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer", background: fakePdf ? "#F0FDF4" : "#F8FAFC", transition: "all 0.2s" }}>
                {fakePdf ? <span style={{ color: "#059669", fontWeight: 600 }}>✓ {fakePdf}</span> : <span style={{ color: "#94A3B8", fontSize: 14 }}>Clique para selecionar o PDF</span>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={handleCloseNew} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={handleCreate} style={{ padding: "10px 20px", background: tenant.color, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Criar e Gerar Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROPOSAL DETAIL ──────────────────────────────────────────────────────────
function ProposalDetail({ proposal, clients, tenant, setToast, onBack, setViewClient }) {
  const client = clients.find(c => c.id === proposal.clientId);
  const link = `propostamais.app/p/${proposal.token}`;
  const template = tenant.waTemplate || "Olá {contato}! Segue o link da proposta.\n\n🔗 https://{link}\n🔑 Senha: {senha}\n\n{apresentacao}";
  const waMsgRaw = template
    .replace("{contato}", client?.contact?.split(" ")[0] || "")
    .replace("{titulo}", proposal.title)
    .replace("{link}", link)
    .replace("{senha}", proposal.accessCode)
    .replace("{apresentacao}", proposal.apresentacao || "");
  const waMsg = encodeURIComponent(waMsgRaw);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 14, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>← Voltar às propostas</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 6px", fontFamily: "'DM Serif Display', Georgia, serif" }}>{proposal.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge status={proposal.status} />
            <span style={{ fontSize: 13, color: "#64748B" }}>Enviada em {fmtDate(proposal.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={`https://wa.me/55${client?.phone?.replace(/\D/g,"")}?text=${waMsg}`} target="_blank" rel="noreferrer"
            style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            💬 WhatsApp
          </a>
          <button onClick={() => { navigator.clipboard?.writeText(`https://${link}`); setToast("Link copiado!"); }}
            style={{ background: "#fff", color: "#374151", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            🔗 Copiar Link
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Info do cliente */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Cliente</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{client?.name}</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>{client?.contact}</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>{client?.email}</div>
        </div>

        {/* Acesso */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Link & Acesso</div>
          <div style={{ fontSize: 13, color: "#2563EB", marginBottom: 8, wordBreak: "break-all" }}>{link}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>Senha:</span>
            <span style={{ background: "#F1F5F9", padding: "2px 10px", borderRadius: 6, fontWeight: 700, fontFamily: "monospace", fontSize: 15, letterSpacing: 3 }}>{proposal.accessCode}</span>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Métricas de Leitura</div>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { label: "Total de acessos", value: proposal.events.filter(e => e.type === "opened").length || (proposal.status !== "sent" ? 1 : 0) },
            { label: "Tempo de leitura", value: fmtDuration(proposal.events.find(e => e.type === "read")?.duration) },
            { label: "Primeiro acesso", value: fmtDate(proposal.events.find(e => e.type === "opened")?.at) },
            { label: "Dispositivo", value: proposal.events.find(e => e.device)?.device || "—" },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Timeline de Eventos</div>
        <div style={{ position: "relative" }}>
          {proposal.events.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 16, paddingBottom: i < proposal.events.length - 1 ? 20 : 0, position: "relative" }}>
              {i < proposal.events.length - 1 && <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 2, background: "#F1F5F9" }} />}
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: e.type === "accepted" ? "#ECFDF5" : e.type === "refused" ? "#FEF2F2" : e.type === "read" ? "#F5F3FF" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, border: "2px solid #fff", boxShadow: "0 0 0 2px #E2E8F0" }}>
                {e.type === "accepted" ? "✓" : e.type === "refused" ? "✗" : e.type === "opened" ? "👁" : e.type === "read" ? "📖" : "📤"}
              </div>
              <div style={{ paddingTop: 4, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{EVENT_LABELS[e.type] || e.type}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{fmtDate(e.at)}{e.device ? ` · ${e.device}` : ""}{e.duration ? ` · ${fmtDuration(e.duration)}` : ""}</div>
                {e.comment && <div style={{ marginTop: 8, background: "#F8FAFC", borderLeft: `3px solid ${tenant.color}`, padding: "8px 12px", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#374151", fontStyle: "italic" }}>"{e.comment}"</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTS PAGE ─────────────────────────────────────────────────────────────
function ClientsPage({ clients, setClients, proposals, tenant, setToast }) {
  const [showNew, setShowNew] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "" });

  function handleCreate() {
    if (!form.name) return;
    setClients(prev => [...prev, { id: "c" + Date.now(), ...form }]);
    setForm({ name: "", contact: "", email: "", phone: "" });
    setShowNew(false);
    setToast("Cliente cadastrado com sucesso.");
  }

  function handleEdit(c) {
    setEditingClient(c.id);
    setForm({ name: c.name, contact: c.contact, email: c.email, phone: c.phone });
  }

  function handleSaveEdit() {
    if (!form.name) return;
    setClients(prev => prev.map(c => c.id === editingClient ? { ...c, ...form } : c));
    setEditingClient(null);
    setForm({ name: "", contact: "", email: "", phone: "" });
    setToast("Cliente atualizado com sucesso.");
  }

  function handleCloseModal() {
    setShowNew(false);
    setEditingClient(null);
    setForm({ name: "", contact: "", email: "", phone: "" });
  }

  const isModalOpen = showNew || !!editingClient;
  const modalTitle = editingClient ? "Editar Cliente" : "Novo Cliente";
  const modalAction = editingClient ? handleSaveEdit : handleCreate;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>Clientes</h1>
          <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 14 }}>{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ background: tenant.color, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Novo Cliente</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clients.map(c => {
          const cProposals = proposals.filter(p => p.clientId === c.id);
          const accepted = cProposals.filter(p => p.status === "accepted").length;
          return (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: tenant.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: tenant.color, flexShrink: 0 }}>
                {c.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>{c.contact} · {c.email}</div>
                {c.phone && c.phone !== "—" && <div style={{ fontSize: 13, color: "#94A3B8" }}>📱 {c.phone}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{cProposals.length} proposta{cProposals.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 12, color: "#059669" }}>{accepted} aceita{accepted !== 1 ? "s" : ""}</div>
                </div>
                <button onClick={() => handleEdit(c)}
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = tenant.color + "10"; e.currentTarget.style.borderColor = tenant.color; e.currentTarget.style.color = tenant.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#374151"; }}>
                  ✏ Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Serif Display', Georgia, serif" }}>{modalTitle}</h2>
            {editingClient && <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B" }}>Atualize os dados do cliente abaixo.</p>}
            {!editingClient && <div style={{ marginBottom: 20 }} />}
            {[["name","Nome da empresa *"],["contact","Nome do contato"],["email","E-mail"],["phone","WhatsApp"]].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{l}</label>
                <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = tenant.color}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={handleCloseModal} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={modalAction} style={{ padding: "10px 20px", background: tenant.color, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {editingClient ? "Salvar alterações" : "Salvar"}
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
  const tenantUsers = users.filter(u => u.tenantKey === currentUser.tenantKey);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "vendedor" });
  const [editingId, setEditingId] = useState(null);

  function handleSave() {
    if (!form.name || !form.email) return;
    if (editingId) {
      setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...form } : u));
      setToast("Usuário atualizado com sucesso.");
    } else {
      if (users.find(u => u.email === form.email)) { setToast("E-mail já cadastrado."); return; }
      setUsers(prev => [...prev, { id: "u" + Date.now(), tenantKey: currentUser.tenantKey, ...form }]);
      setToast("Usuário criado com sucesso.");
    }
    setShowNew(false); setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "vendedor" });
  }

  function handleEdit(u) {
    setEditingId(u.id); setForm({ name: u.name, email: u.email, password: u.password, role: u.role });
    setShowNew(true);
  }

  function handleToggleRole(u) {
    if (u.id === currentUser.id) { setToast("Você não pode alterar sua própria função."); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: x.role === "admin" ? "vendedor" : "admin" } : x));
    setToast("Função atualizada.");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0, fontFamily: "'DM Serif Display', Georgia, serif" }}>Usuários</h1>
          <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 14 }}>{tenantUsers.length} usuário{tenantUsers.length !== 1 ? "s" : ""} cadastrado{tenantUsers.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name: "", email: "", password: "", role: "vendedor" }); setShowNew(true); }}
          style={{ background: tenant.color, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Novo Usuário</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tenantUsers.map(u => (
          <div key={u.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.role === "admin" ? tenant.color : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: u.role === "admin" ? "#fff" : "#64748B", flexShrink: 0 }}>
              {u.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{u.name}</span>
                {u.id === currentUser.id && <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 10 }}>você</span>}
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{u.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => handleToggleRole(u)} disabled={u.id === currentUser.id}
                style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 700, cursor: u.id === currentUser.id ? "not-allowed" : "pointer", opacity: u.id === currentUser.id ? 0.5 : 1,
                  background: u.role === "admin" ? tenant.color + "15" : "#F1F5F9",
                  color: u.role === "admin" ? tenant.color : "#64748B",
                  borderColor: u.role === "admin" ? tenant.color : "#E2E8F0" }}>
                {u.role === "admin" ? "Admin" : "Vendedor"}
              </button>
              <button onClick={() => handleEdit(u)}
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.background = tenant.color + "10"; e.currentTarget.style.borderColor = tenant.color; e.currentTarget.style.color = tenant.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#374151"; }}>
                ✏ Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Serif Display', Georgia, serif" }}>{editingId ? "Editar Usuário" : "Novo Usuário"}</h2>
            {[["name","Nome completo *"],["email","E-mail *"],["password","Senha"]].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{l}</label>
                <input type={k === "password" ? "password" : "text"} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={k === "password" && editingId ? "Deixe em branco para manter" : ""}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = tenant.color}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Função</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["vendedor","admin"].map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid", cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.15s",
                      background: form.role === r ? tenant.color : "#fff",
                      color: form.role === r ? "#fff" : "#374151",
                      borderColor: form.role === r ? tenant.color : "#E2E8F0" }}>
                    {r === "admin" ? "👑 Admin" : "👤 Vendedor"}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#94A3B8" }}>
                {form.role === "admin" ? "Admin visualiza todas as propostas da empresa e gerencia usuários." : "Vendedor visualiza apenas suas próprias propostas."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNew(false); setEditingId(null); }} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: "10px 20px", background: tenant.color, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {editingId ? "Salvar alterações" : "Criar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function SettingsPage({ tenant, setTenant, setToast }) {
  const [form, setForm] = useState({ ...tenant });
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "0 0 24px", fontFamily: "'DM Serif Display', Georgia, serif" }}>Configurações</h1>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #E2E8F0", maxWidth: 560 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 20 }}>Identidade Visual (White Label)</div>
        {[["name","Nome da empresa"],["email","E-mail do remetente"]].map(([k, l]) => (
          <div key={k} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{l}</label>
            <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Cor primária</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 40, border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", padding: 2 }} />
            <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", width: 120, fontFamily: "monospace" }} />
            <div style={{ width: 40, height: 40, borderRadius: 8, background: form.color }} />
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Mensagem padrão do WhatsApp
          </label>
          <textarea value={form.waTemplate || ""} onChange={e => setForm(f => ({ ...f, waTemplate: e.target.value }))} rows={7}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} />
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
            Variáveis disponíveis:<br/>
            <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{"{contato}"}</code> Nome do contato &nbsp;
            <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{"{titulo}"}</code> Título da proposta &nbsp;
            <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{"{link}"}</code> Link da proposta<br/>
            <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{"{senha}"}</code> Senha de acesso &nbsp;
            <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{"{apresentacao}"}</code> Texto de apresentação da proposta
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Símbolo / Inicial</label>
          <input value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value.charAt(0) }))} maxLength={1} style={{ width: 60, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 20, fontWeight: 800, outline: "none", textAlign: "center" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setTenant(form); setToast("Configurações salvas!"); }} style={{ padding: "10px 24px", background: form.color, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Salvar alterações</button>
        </div>
        <div style={{ marginTop: 24, padding: 16, background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>PRÉVIA — Página do cliente</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: form.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>{form.logo}</div>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>{form.name}</span>
          </div>
          <div style={{ marginTop: 10, background: form.color, color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "inline-block" }}>Aceitar Proposta</div>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENT VIEW (página pública simulada) ────────────────────────────────────
function ClientView({ proposal, clients, tenant, onBack }) {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [timeRead, setTimeRead] = useState(0);
  const timerRef = useRef(null);
  const client = clients.find(c => c.id === proposal.clientId);

  useEffect(() => {
    if (unlocked) {
      timerRef.current = setInterval(() => setTimeRead(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [unlocked]);

  function handleUnlock() {
    if (code === proposal.accessCode) { setUnlocked(true); setError(""); }
    else { setError("Senha incorreta. Verifique com o seu contato."); }
  }

  function handleDecision(type) {
    if (!comment && type === "refused") return;
    setDecision(type);
    setShowModal(null);
  }

  const alreadyDecided = proposal.events.some(e => e.type === "accepted" || e.type === "refused");
  const existingDecision = proposal.events.find(e => e.type === "accepted" || e.type === "refused");

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Serif Display', Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: tenant.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{tenant.logo}</div>
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>{tenant.name}</div>
          <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "system-ui, sans-serif" }}>Proposta Comercial</div>
        </div>
        <button onClick={onBack} style={{ marginLeft: "auto", background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#64748B", fontFamily: "system-ui, sans-serif" }}>← Voltar (demo)</button>
      </div>

      {!unlocked ? (
        <div style={{ maxWidth: 400, margin: "80px auto", background: "#fff", borderRadius: 16, padding: 40, boxShadow: "0 4px 30px rgba(0,0,0,0.08)", border: "1px solid #E2E8F0", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Acesso à Proposta</h2>
          <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 24px", fontFamily: "system-ui, sans-serif" }}>Digite o código que você recebeu por WhatsApp</p>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUnlock()} placeholder="000000" maxLength={6}
            style={{ width: "100%", padding: "14px", border: `2px solid ${error ? "#DC2626" : "#E2E8F0"}`, borderRadius: 10, fontSize: 28, fontWeight: 800, textAlign: "center", letterSpacing: 10, outline: "none", boxSizing: "border-box", fontFamily: "monospace", marginBottom: 12 }} />
          {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 12, fontFamily: "system-ui, sans-serif" }}>{error}</div>}
          <button onClick={handleUnlock} style={{ width: "100%", background: tenant.color, color: "#fff", border: "none", borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Acessar Proposta</button>
          <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8", fontFamily: "system-ui, sans-serif" }}>Dica: a senha para este demo é <strong>{proposal.accessCode}</strong></div>
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, border: "1px solid #E2E8F0", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>PROPOSTA PARA</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{client?.name}</h1>
                <div style={{ fontSize: 14, color: "#64748B", fontFamily: "system-ui, sans-serif", marginTop: 4 }}>{proposal.title}</div>
            {proposal.apresentacao && (
              <div style={{ marginTop: 12, padding: "12px 16px", background: "#F8FAFC", borderRadius: 8, borderLeft: `3px solid ${tenant.color}`, fontSize: 14, color: "#374151", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
                {proposal.apresentacao}
              </div>
            )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => window.open("about:blank")} style={{ background: "#F8FAFC", color: "#374151", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>🖨 Imprimir / Baixar</button>
              </div>
            </div>
            {unlocked && <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8", fontFamily: "system-ui, sans-serif" }}>⏱ Você está lendo há {timeRead}s</div>}
          </div>

          {/* PDF simulado */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ background: "#F1F5F9", padding: "12px 20px", borderBottom: "1px solid #E2E8F0", fontSize: 13, color: "#64748B", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📄</span> {proposal.title}.pdf
            </div>
            <div style={{ padding: 40, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: tenant.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>📄</div>
              <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Visualizador de PDF</div>
                <div style={{ fontSize: 13, color: "#64748B", maxWidth: 360 }}>Em produção, o PDF da proposta seria renderizado aqui via iframe. O cliente pode rolar, visualizar e imprimir diretamente.</div>
                <div style={{ marginTop: 16, padding: "10px 20px", background: "#F8FAFC", borderRadius: 8, fontFamily: "monospace", fontSize: 13, color: "#64748B" }}>{"<iframe src='[pdf-url-assinada]' />"}</div>
              </div>
            </div>
          </div>

          {/* Ações */}
          {!decision && !alreadyDecided && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #E2E8F0", display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14, color: "#64748B", fontFamily: "system-ui, sans-serif" }}>O que você decide sobre esta proposta?</span>
              <button onClick={() => setShowModal("accepted")} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>✓ Aceitar Proposta</button>
              <button onClick={() => setShowModal("refused")} style={{ background: "#fff", color: "#DC2626", border: "2px solid #DC2626", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>✗ Recusar Proposta</button>
            </div>
          )}

          {(decision || alreadyDecided) && (
            <div style={{ background: decision === "accepted" || existingDecision?.type === "accepted" ? "#ECFDF5" : "#FEF2F2", borderRadius: 16, padding: 24, border: `1px solid ${decision === "accepted" || existingDecision?.type === "accepted" ? "#A7F3D0" : "#FECACA"}`, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{decision === "accepted" || existingDecision?.type === "accepted" ? "🎉" : "😔"}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", fontFamily: "system-ui, sans-serif" }}>
                {decision === "accepted" || existingDecision?.type === "accepted" ? "Proposta aceita!" : "Proposta recusada"}
              </div>
              <div style={{ fontSize: 14, color: "#64748B", fontFamily: "system-ui, sans-serif", marginTop: 6 }}>Sua resposta foi registrada. Entraremos em contato em breve.</div>
              {existingDecision?.comment && <div style={{ marginTop: 12, fontStyle: "italic", color: "#374151", fontFamily: "system-ui, sans-serif", fontSize: 14 }}>"{existingDecision.comment}"</div>}
            </div>
          )}
        </div>
      )}

      {/* Modal decisão */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{showModal === "accepted" ? "Aceitar proposta" : "Recusar proposta"}</h2>
            <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 20px", fontFamily: "system-ui, sans-serif" }}>
              {showModal === "accepted" ? "Deixe um comentário opcional para o vendedor." : "Informe o motivo da recusa."}
            </p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={showModal === "accepted" ? "Comentário opcional..." : "Motivo da recusa (obrigatório)..."} rows={3}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "system-ui, sans-serif", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(null)} style={{ padding: "10px 20px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "system-ui, sans-serif" }}>Cancelar</button>
              <button onClick={() => handleDecision(showModal)} disabled={showModal === "refused" && !comment}
                style={{ padding: "10px 20px", background: showModal === "accepted" ? "#059669" : "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: showModal === "refused" && !comment ? "not-allowed" : "pointer", opacity: showModal === "refused" && !comment ? 0.5 : 1, fontFamily: "system-ui, sans-serif" }}>
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
function Login({ onLogin, users }) {
  const [email, setEmail] = useState("rodrigo@staefa.com.br");
  const [pass, setPass] = useState("123456");
  const [err, setErr] = useState("");

  function handle() {
    const user = users.find(u => u.email === email && u.password === pass);
    if (!user) { setErr("E-mail ou senha inválidos."); return; }
    const tenant = MOCK_TENANTS[user.tenantKey];
    onLogin(tenant, user);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 420, background: "#fff", borderRadius: 20, padding: 40, boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Serif Display', Georgia, serif" }}>Proposta+</h1>
          <p style={{ color: "#64748B", margin: "6px 0 0", fontSize: 14 }}>Gestão e envio de propostas comerciais</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Senha</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button onClick={handle} style={{ width: "100%", background: "#E63946", color: "#fff", border: "none", borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 12 }}>Entrar</button>
        <div style={{ marginTop: 20, padding: 14, background: "#F8FAFC", borderRadius: 10, fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
          <strong>Demo — contas disponíveis:</strong><br />
          👑 rodrigo@staefa.com.br · 123456 (Admin Staefa)<br />
          👤 carlos@staefa.com.br · 123456 (Vendedor Staefa)<br />
          👤 ana@staefa.com.br · 123456 (Vendedor Staefa)<br />
          👑 rodrigo@halten.com.br · 123456 (Admin Halten)
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tenant, setTenant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(MOCK_USERS);
  const [page, setPage] = useState("dashboard");
  const [proposals, setProposals] = useState(initialProposals);
  const [clients, setClients] = useState(initialClients);
  const [toast, setToast] = useState(null);
  const [viewProposalId, setViewProposalId] = useState(null);
  const [clientViewToken, setClientViewToken] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #F1F5F9; }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (!tenant || !currentUser) return <Login users={users} onLogin={(t, u) => { setTenant(t); setCurrentUser({ ...u, tenantKey: u.tenantKey }); setPage("dashboard"); }} />;

  const tenantProposals = proposals.filter(p => {
    const client = clients.find(c => c.id === p.clientId);
    return users.find(u => u.id === p.userId && u.tenantKey === currentUser.tenantKey);
  });

  const viewProposal = viewProposalId ? proposals.find(p => p.id === viewProposalId) : null;
  const clientViewProposal = clientViewToken ? proposals.find(p => p.token === clientViewToken) : null;

  if (clientViewProposal) {
    return <ClientView proposal={clientViewProposal} clients={clients} tenant={tenant} onBack={() => setClientViewToken(null)} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar page={page} setPage={p => { setPage(p); setViewProposalId(null); }} tenant={tenant} currentUser={currentUser} onLogout={() => { setTenant(null); setCurrentUser(null); }} />
      <main style={{ marginLeft: 220, flex: 1, padding: "32px 36px", minHeight: "100vh" }}>
        {page === "dashboard" && <Dashboard proposals={tenantProposals} clients={clients} tenant={tenant} currentUser={currentUser} setPage={setPage} />}
        {page === "proposals" && !viewProposal && (
          <ProposalsPage proposals={tenantProposals} setProposals={setProposals} clients={clients} setClients={setClients} tenant={tenant} currentUser={currentUser} users={users} setToast={setToast} setPage={setPage} setViewProposal={setViewProposalId} />
        )}
        {page === "proposals" && viewProposal && (
          <>
            <ProposalDetail proposal={viewProposal} clients={clients} tenant={tenant} setToast={setToast} onBack={() => setViewProposalId(null)} />
            <div style={{ marginTop: 20, padding: 16, background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>👁</span>
              <div style={{ fontSize: 13, color: "#1E40AF" }}>
                <strong>Simular visão do cliente:</strong> como o cliente veria essa proposta ao acessar o link.
                <button onClick={() => setClientViewToken(viewProposal.token)} style={{ marginLeft: 12, background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Abrir página do cliente →</button>
              </div>
            </div>
          </>
        )}
        {page === "clients" && <ClientsPage clients={clients} setClients={setClients} proposals={tenantProposals} tenant={tenant} setToast={setToast} />}
        {page === "users" && currentUser.role === "admin" && <UsersPage users={users} setUsers={setUsers} tenant={tenant} currentUser={currentUser} setToast={setToast} />}
        {page === "settings" && <SettingsPage tenant={tenant} setTenant={setTenant} setToast={setToast} />}
      </main>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
