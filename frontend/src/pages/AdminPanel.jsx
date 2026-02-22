// src/pages/AdminPanel.jsx
import { useState, useEffect } from "react";
import { Button, Input, Select, StatCard, Modal, Spinner, MultiRoleBadges, SectionHeader } from "../components/ui";
import { useToastStore, useRolesStore } from "../store";
import { getRoleColor, getRoleLabel, DEFAULT_ROLE_LABELS } from "../lib/constants";
import * as api from "../lib/api";

const ALL_ROLES = Object.keys(DEFAULT_ROLE_LABELS);
const FIELD_TYPES = [{value:"text",label:"Tekst"},{value:"number",label:"Liczba"},{value:"select",label:"Lista wyboru"},{value:"textarea",label:"Wieloliniowy tekst"},{value:"date",label:"Data"}];

// ── TAB: Role Labels ──────────────────────────────────────────────────────────
function RoleLabelsTab() {
  const { roles, fetchRoles } = useRolesStore();
  const { add: toast } = useToastStore();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label:"", color:"" });
  const [busy, setBusy] = useState(false);

  const startEdit = (role) => { setEditing(role.key); setForm({ label: role.label, color: role.color }); };

  const save = async () => {
    setBusy(true);
    try {
      await api.updateRole(editing, form);
      await fetchRoles();
      toast("Zaktualizowano ✓");
      setEditing(null);
    } catch { toast("Błąd", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <p style={{ color:"#64748b",fontSize:13,marginBottom:16 }}>Zmień wyświetlaną nazwę i kolor dla każdej roli systemowej.</p>
      <div style={{ display:"grid",gap:8 }}>
        {roles.map(role=>(
          <div key={role.key} style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:12,height:12,borderRadius:"50%",background:role.color,flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{role.label}</div>
              <div style={{ fontSize:11,color:"#475569" }}>Klucz: {role.key}</div>
            </div>
            {editing===role.key ? (
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} style={{ padding:"6px 10px",background:"#080d14",border:"1px solid #334155",borderRadius:6,color:"#e2e8f0",fontSize:13,outline:"none",width:180 }}/>
                <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{ width:36,height:32,padding:2,background:"#080d14",border:"1px solid #334155",borderRadius:4,cursor:"pointer" }}/>
                <Button variant="success" onClick={save} loading={busy} style={{ padding:"6px 12px",fontSize:12 }}>Zapisz</Button>
                <Button variant="ghost" onClick={()=>setEditing(null)} style={{ padding:"6px 10px",fontSize:12 }}>Anuluj</Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={()=>startEdit(role)} style={{ padding:"6px 12px",fontSize:12 }}>Edytuj</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TAB: File Configs ─────────────────────────────────────────────────────────
function FileConfigsTab() {
  const { fileConfigs, fetchFileConfigs } = useRolesStore();
  const { add: toast } = useToastStore();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ allowedExtensions:"", maxSizeMb:100 });
  const [busy, setBusy] = useState(false);

  const workerRoles = ["editor","illustrator","graphic_designer","printer","office_employee"];

  const getConfig = (roleKey) => fileConfigs.find(c=>c.role_key===roleKey) || { allowed_extensions:".pdf,.jpg,.jpeg,.png", max_size_mb: 100 };

  const startEdit = (roleKey) => {
    const c = getConfig(roleKey);
    setEditing(roleKey);
    setForm({ allowedExtensions: c.allowed_extensions, maxSizeMb: c.max_size_mb });
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.updateFileConfig(editing, { allowedExtensions: form.allowedExtensions, maxSizeMb: Number(form.maxSizeMb) });
      await fetchFileConfigs();
      toast("Konfiguracja zapisana ✓");
      setEditing(null);
    } catch(e) { toast(e.response?.data?.error||"Błąd","error"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <p style={{ color:"#64748b",fontSize:13,marginBottom:16 }}>Ustaw dozwolone rozszerzenia plików i maksymalny rozmiar dla każdej roli produkcyjnej.</p>
      <div style={{ display:"grid",gap:10 }}>
        {workerRoles.map(roleKey=>{
          const c = getConfig(roleKey);
          const color = getRoleColor(roleKey);
          return (
            <div key={roleKey} style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:"14px 16px",borderLeft:`3px solid ${color}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:editing===roleKey?14:0 }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color,marginBottom:4 }}>{getRoleLabel(roleKey)}</div>
                  {editing!==roleKey&&<div style={{ fontSize:12,color:"#64748b" }}>{c.allowed_extensions} · max {c.max_size_mb} MB</div>}
                </div>
                {editing!==roleKey&&<Button variant="secondary" onClick={()=>startEdit(roleKey)} style={{ padding:"6px 12px",fontSize:12 }}>Edytuj</Button>}
              </div>
              {editing===roleKey&&(
                <div style={{ display:"grid",gap:12 }}>
                  <Input label="Dozwolone rozszerzenia (oddzielone przecinkiem)" value={form.allowedExtensions} onChange={v=>setForm(f=>({...f,allowedExtensions:v}))} placeholder=".pdf,.jpg,.png,.ai" hint="Przykład: .pdf,.jpg,.jpeg,.png,.ai,.svg"/>
                  <Input label="Maksymalny rozmiar pliku (MB)" type="number" value={String(form.maxSizeMb)} onChange={v=>setForm(f=>({...f,maxSizeMb:v}))} placeholder="100"/>
                  <div style={{ display:"flex",gap:8 }}>
                    <Button variant="success" onClick={save} loading={busy} style={{ fontSize:12,padding:"7px 14px" }}>Zapisz</Button>
                    <Button variant="ghost" onClick={()=>setEditing(null)} style={{ fontSize:12,padding:"7px 12px" }}>Anuluj</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TAB: Templates ────────────────────────────────────────────────────────────
function FieldEditor({ fields, onChange }) {
  const addField = () => onChange([...fields, { key:`pole_${Date.now()}`, label:"Nowe pole", type:"text", required:false, options:[], placeholder:"" }]);
  const updateField = (i, update) => onChange(fields.map((f,idx)=>idx===i?{...f,...update}:f));
  const removeField = (i) => onChange(fields.filter((_,idx)=>idx!==i));

  return (
    <div>
      <div style={{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:600 }}>Pola formularza</div>
      {fields.map((f,i)=>(
        <div key={i} style={{ background:"#080d14",border:"1px solid #1e293b",borderRadius:8,padding:12,marginBottom:8 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end" }}>
            <Input label="Etykieta" value={f.label} onChange={v=>updateField(i,{label:v})} placeholder="Liczba stron"/>
            <Select label="Typ" value={f.type} onChange={v=>updateField(i,{type:v})} options={FIELD_TYPES}/>
            <button onClick={()=>removeField(i)} style={{ padding:"8px 10px",background:"#450a0a",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,cursor:"pointer",fontSize:12,marginBottom:0 }}>✕</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8 }}>
            <Input label="Klucz (bez spacji)" value={f.key} onChange={v=>updateField(i,{key:v.replace(/\s/g,"_")})} placeholder="pole_klucz"/>
            <div style={{ display:"flex",alignItems:"center",gap:8,paddingTop:20 }}>
              <input type="checkbox" checked={f.required||false} onChange={e=>updateField(i,{required:e.target.checked})} id={`req_${i}`}/>
              <label htmlFor={`req_${i}`} style={{ fontSize:13,color:"#94a3b8",cursor:"pointer" }}>Wymagane</label>
            </div>
          </div>
          {f.type==="select"&&<div style={{ marginTop:8 }}>
            <Input label="Opcje (oddzielone przecinkiem)" value={(f.options||[]).join(",")} onChange={v=>updateField(i,{options:v.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="Opcja 1,Opcja 2,Opcja 3"/>
          </div>}
        </div>
      ))}
      <button onClick={addField} style={{ width:"100%",padding:"8px",background:"transparent",border:"1px dashed #334155",borderRadius:6,color:"#64748b",cursor:"pointer",fontSize:12 }}>+ Dodaj pole</button>
    </div>
  );
}

function TemplatesTab() {
  const { templates, fetchTemplates } = useRolesStore();
  const { add: toast } = useToastStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", description:"", productType:"", fieldsConfig:[] });
  const [busy, setBusy] = useState(false);
  const setF = k=>v=>setForm(f=>({...f,[k]:v}));

  const openCreate = () => { setForm({ name:"",description:"",productType:"",fieldsConfig:[] }); setEditId(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ name:t.name,description:t.description||"",productType:t.product_type,fieldsConfig:t.fields_config||[] }); setEditId(t.id); setShowForm(true); };

  const save = async () => {
    if (!form.name||!form.productType) return;
    setBusy(true);
    try {
      if (editId) await api.updateTemplate(editId, { name:form.name, description:form.description, productType:form.productType, fieldsConfig:form.fieldsConfig });
      else await api.createTemplate({ name:form.name, description:form.description, productType:form.productType, fieldsConfig:form.fieldsConfig });
      await fetchTemplates();
      toast(`Szablon ${editId?"zaktualizowany":"utworzony"} ✓`);
      setShowForm(false);
    } catch(e) { toast(e.response?.data?.error||"Błąd","error"); }
    finally { setBusy(false); }
  };

  const toggleActive = async (t) => {
    await api.updateTemplate(t.id, { isActive: !t.is_active });
    await fetchTemplates(); toast(`Szablon ${t.is_active?"dezaktywowany":"aktywowany"}`);
  };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <p style={{ margin:0,color:"#64748b",fontSize:13 }}>Szablony pojawiają się przy tworzeniu zamówienia i definiują pola formularza.</p>
        <Button variant="primary" onClick={openCreate} style={{ fontSize:12,padding:"7px 14px" }}>+ Nowy szablon</Button>
      </div>
      <div style={{ display:"grid",gap:10 }}>
        {templates.map(t=>(
          <div key={t.id} style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:"14px 16px",opacity:t.is_active?1:0.5 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:2 }}>{t.name}</div>
                <div style={{ fontSize:12,color:"#64748b" }}>{t.product_type} · {(t.fields_config||[]).length} pól</div>
                {t.description&&<div style={{ fontSize:12,color:"#475569",marginTop:4 }}>{t.description}</div>}
              </div>
              <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                <Button variant="secondary" onClick={()=>openEdit(t)} style={{ fontSize:11,padding:"5px 10px" }}>Edytuj</Button>
                <button onClick={()=>toggleActive(t)} style={{ padding:"5px 10px",background:t.is_active?"#422006":"#052e16",color:t.is_active?"#f59e0b":"#22c55e",border:`1px solid ${t.is_active?"#f59e0b33":"#22c55e33"}`,borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600 }}>
                  {t.is_active?"Deaktywuj":"Aktywuj"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {templates.length===0&&<div style={{ color:"#64748b",fontSize:13,textAlign:"center",padding:"24px 0" }}>Brak szablonów. Utwórz pierwszy.</div>}
      </div>

      {showForm&&(
        <Modal title={editId?"Edytuj szablon":"Nowy szablon"} onClose={()=>setShowForm(false)} maxWidth={600}>
          <div style={{ padding:24,display:"grid",gap:16,overflowY:"auto" }}>
            <Input label="Nazwa szablonu" value={form.name} onChange={setF("name")} placeholder="Katalog produktowy" required/>
            <Input label="Typ produktu" value={form.productType} onChange={setF("productType")} placeholder="Katalog" required/>
            <Input label="Opis (opcjonalnie)" value={form.description} onChange={setF("description")} placeholder="Krótki opis szablonu" multiline rows={2}/>
            <FieldEditor fields={form.fieldsConfig} onChange={setF("fieldsConfig")}/>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              <Button variant="ghost" onClick={()=>setShowForm(false)}>Anuluj</Button>
              <Button variant="success" onClick={save} loading={busy} disabled={!form.name||!form.productType}>Zapisz szablon</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── TAB: Users ────────────────────────────────────────────────────────────────
function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showStats, setShowStats] = useState(null);
  const [stats, setStats] = useState(null);
  const { add: toast } = useToastStore();

  const load = () => { setLoading(true); api.getUsers().then(r=>setUsers(r.data)).finally(()=>setLoading(false)); };
  useEffect(load, []);

  const openStats = async (u) => { setShowStats(u); try { const { data } = await api.getUserStats(u.id); setStats(data); } catch {} };

  const handleCreateOrUpdate = async (form, userId) => {
    try {
      if (userId) await api.updateUser(userId, form);
      else await api.createUser(form);
      toast(userId?"Zaktualizowano ✓":"Użytkownik utworzony ✓");
      load(); setShowCreate(false); setEditUser(null);
    } catch(e) { toast(e.response?.data?.error||"Błąd","error"); }
  };

  const handleToggle = async (u) => {
    if (u.id===currentUserId) return toast("Nie możesz dezaktywować swojego konta","error");
    try { await api.updateUser(u.id,{isActive:!u.isActive}); load(); toast(`Konto ${u.isActive?"dezaktywowane":"aktywowane"}`); }
    catch(e) { toast(e.response?.data?.error||"Błąd","error"); }
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:40 }}><Spinner size={32}/></div>;

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
        <Button variant="primary" onClick={()=>setShowCreate(true)} style={{ fontSize:12,padding:"7px 14px" }}>+ Nowy użytkownik</Button>
      </div>
      <div style={{ display:"grid",gap:8 }}>
        {users.map(u=>(
          <div key={u.id} style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:u.isActive?1:0.5 }}>
            <div style={{ width:36,height:36,borderRadius:"50%",background:getRoleColor(u.roles?.[0]||"editor")+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:getRoleColor(u.roles?.[0]||"editor"),flexShrink:0 }}>
              {u.fullName?.split(" ").map(p=>p[0]).join("")||"?"}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:2 }}>{u.fullName}</div>
              <div style={{ fontSize:11,color:"#475569",marginBottom:4 }}>{u.email}</div>
              <MultiRoleBadges roles={u.roles}/>
            </div>
            <div style={{ display:"flex",gap:6,flexShrink:0 }}>
              <button onClick={()=>openStats(u)} style={{ padding:"5px 8px",background:"#1e3a5f",color:"#60a5fa",border:"1px solid #1d4ed844",borderRadius:5,cursor:"pointer",fontSize:11 }}>📊</button>
              <button onClick={()=>setEditUser(u)} style={{ padding:"5px 8px",background:"#1e293b",color:"#94a3b8",border:"1px solid #1e293b",borderRadius:5,cursor:"pointer",fontSize:11 }}>✏</button>
              {u.id!==currentUserId&&<button onClick={()=>handleToggle(u)} style={{ padding:"5px 10px",background:u.isActive?"#1a0a0a":"#052e16",color:u.isActive?"#ef4444":"#22c55e",border:`1px solid ${u.isActive?"#ef444433":"#22c55e33"}`,borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600 }}>{u.isActive?"Dezakt.":"Aktywuj"}</button>}
            </div>
          </div>
        ))}
      </div>

      {(showCreate||editUser)&&(
        <UserFormModal user={editUser} onClose={()=>{setShowCreate(false);setEditUser(null);}} onSubmit={handleCreateOrUpdate} currentUserId={currentUserId}/>
      )}

      {showStats&&(
        <Modal title={`Statystyki — ${showStats.fullName}`} onClose={()=>{setShowStats(null);setStats(null);}}>
          <div style={{ padding:24 }}>
            {!stats?<div style={{ display:"flex",justifyContent:"center",padding:30 }}><Spinner/></div>:(
              <div style={{ display:"grid",gap:16 }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                  {stats.completions?.map(c=>(
                    <div key={c.action} style={{ background:"#080d14",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px",textAlign:"center" }}>
                      <div style={{ fontSize:24,fontWeight:800,color:"#60a5fa",fontFamily:"'Space Mono',monospace" }}>{c.count}</div>
                      <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1 }}>{c.action}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Ostatnie aktywności wg miesiąca</div>
                  {stats.byMonth?.map(m=>(
                    <div key={m.month} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1e293b",fontSize:13 }}>
                      <span style={{ color:"#94a3b8" }}>{m.month}</span>
                      <span style={{ color:"#60a5fa",fontFamily:"'Space Mono',monospace",fontWeight:700 }}>{m.count} zakończeń</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSubmit, currentUserId }) {
  const [form, setForm] = useState({ email:user?.email||"", password:"", fullName:user?.fullName||"", roles:user?.roles||[] });
  const [busy, setBusy] = useState(false);
  const setF = k=>v=>setForm(f=>({...f,[k]:v}));
  const toggleRole = r => setForm(f=>({ ...f, roles: f.roles.includes(r)?f.roles.filter(x=>x!==r):[...f.roles,r] }));

  const handle = async e => { e.preventDefault(); setBusy(true); try { await onSubmit(form, user?.id); } finally { setBusy(false); } };

  return (
    <Modal title={user?"Edytuj użytkownika":"Nowy użytkownik"} onClose={onClose} maxWidth={500}>
      <form onSubmit={handle} style={{ padding:24,display:"grid",gap:14 }}>
        <Input label="Imię i nazwisko" value={form.fullName} onChange={setF("fullName")} required/>
        <Input label="Email" type="email" value={form.email} onChange={setF("email")} required/>
        <Input label={user?"Nowe hasło (zostaw puste aby nie zmieniać)":"Hasło"} type="password" value={form.password} onChange={setF("password")} placeholder="Min 8 znaków" required={!user}/>
        <div>
          <div style={{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:600 }}>Role <span style={{ color:"#ef4444" }}>*</span></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
            {ALL_ROLES.map(roleKey=>(
              <label key={roleKey} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:form.roles.includes(roleKey)?"#1e3a5f":"#080d14",border:`1px solid ${form.roles.includes(roleKey)?"#1d4ed8":"#1e293b"}`,borderRadius:6,cursor:"pointer",fontSize:13,transition:"all 0.12s" }}>
                <input type="checkbox" checked={form.roles.includes(roleKey)} onChange={()=>toggleRole(roleKey)} style={{ accentColor:getRoleColor(roleKey) }}/>
                <span style={{ color:form.roles.includes(roleKey)?getRoleColor(roleKey):"#94a3b8",fontWeight:form.roles.includes(roleKey)?600:400 }}>{getRoleLabel(roleKey)}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <Button variant="ghost" onClick={onClose} type="button">Anuluj</Button>
          <Button type="submit" variant="success" loading={busy} disabled={!form.fullName||(!user&&!form.password)||form.roles.length===0}>Zapisz</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── TAB: Creator Stats ────────────────────────────────────────────────────────
function CreatorStatsTab() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getCreatorStats().then(r=>setStats(r.data)).finally(()=>setLoading(false)); }, []);

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:40 }}><Spinner size={32}/></div>;

  return (
    <div>
      <p style={{ color:"#64748b",fontSize:13,marginBottom:16 }}>Liczba zakończeń etapów przez każdego użytkownika — automatycznie zliczane.</p>
      <div style={{ display:"grid",gap:8 }}>
        {stats.map((u,i)=>(
          <div key={u.id} style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:30,height:30,borderRadius:"50%",background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#64748b",flexShrink:0 }}>
              {i+1}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{u.full_name}</div>
              <div style={{ fontSize:11,color:"#475569" }}>{u.email}</div>
            </div>
            <div style={{ display:"flex",gap:16,textAlign:"center" }}>
              <div><div style={{ fontSize:20,fontWeight:800,color:"#22c55e",fontFamily:"'Space Mono',monospace" }}>{u.completions||0}</div><div style={{ fontSize:10,color:"#64748b" }}>Zakończeń</div></div>
              <div><div style={{ fontSize:20,fontWeight:800,color:"#60a5fa",fontFamily:"'Space Mono',monospace" }}>{u.claimed||0}</div><div style={{ fontSize:10,color:"#64748b" }}>Przejętych</div></div>
              <div><div style={{ fontSize:20,fontWeight:800,color:"#f59e0b",fontFamily:"'Space Mono',monospace" }}>{u.rejected||0}</div><div style={{ fontSize:10,color:"#64748b" }}>Odrzuconych</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────────────────────
const TABS = [
  ["roles","🏷 Nazwy ról"],
  ["files","📎 Typy plików"],
  ["templates","📋 Szablony"],
  ["users","👥 Użytkownicy"],
  ["stats","📊 Statystyki"],
];

export default function AdminPanel({ currentUser }) {
  const [tab, setTab] = useState("roles");
  const { fetchRoles, fetchTemplates, fetchFileConfigs } = useRolesStore();

  useEffect(() => { fetchRoles(); fetchTemplates(); fetchFileConfigs(); }, []);

  return (
    <div style={{ maxWidth:900,margin:"0 auto" }}>
      <h2 style={{ margin:"0 0 24px",fontSize:22,fontWeight:800,color:"#e2e8f0" }}>⚙ Panel Administratora</h2>

      {/* Tab bar */}
      <div style={{ display:"flex",borderBottom:"1px solid #1e293b",marginBottom:24,gap:0,overflowX:"auto" }}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ background:"none",border:"none",padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:600,color:tab===k?"#60a5fa":"#64748b",borderBottom:`2px solid ${tab===k?"#60a5fa":"transparent"}`,marginBottom:-1,whiteSpace:"nowrap",transition:"color 0.15s" }}>{l}</button>
        ))}
      </div>

      {tab==="roles"&&<RoleLabelsTab/>}
      {tab==="files"&&<FileConfigsTab/>}
      {tab==="templates"&&<TemplatesTab/>}
      {tab==="users"&&<UsersTab currentUserId={currentUser.id}/>}
      {tab==="stats"&&<CreatorStatsTab/>}
    </div>
  );
}
