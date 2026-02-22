// src/pages/CreateOrderPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Button, Select } from "../components/ui";
import { useOrdersStore, useToastStore, useRolesStore } from "../store";
import * as api from "../lib/api";
import { formatFileSize } from "../lib/constants";

function DynamicField({ field, value, onChange }) {
  if (field.type === "select") {
    return <Select label={field.label} value={value||""} onChange={onChange} options={(field.options||[]).map(o=>({value:o,label:o}))} placeholder="Wybierz..." required={field.required}/>;
  }
  if (field.type === "textarea") {
    return <Input label={field.label} value={value||""} onChange={onChange} placeholder={field.placeholder} multiline rows={3} required={field.required}/>;
  }
  return <Input label={field.label} type={field.type==="number"?"number":"text"} value={value||""} onChange={onChange} placeholder={field.placeholder} required={field.required}/>;
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const { createOrder } = useOrdersStore();
  const { add: toast } = useToastStore();
  const { templates, fetchTemplates } = useRolesStore();
  const [busy, setBusy] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ clientName:"", clientEmail:"", clientPhone:"", productType:"", clientNotes:"" });
  const [customFields, setCustomFields] = useState({});
  const [photos, setPhotos] = useState([]);
  const photoRef = useRef();
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchTemplates(true); }, []);

  const setF = (k) => (v) => setForm(f=>({...f,[k]:v}));
  const setCF = (k) => (v) => setCustomFields(f=>({...f,[k]:v}));

  const handleTemplateChange = (id) => {
    const t = templates.find(x=>x.id===id);
    setSelectedTemplate(t||null);
    if (t) { setForm(f=>({...f, productType: t.product_type})); setCustomFields({}); }
  };

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(p => [...p, ...files.slice(0, 5-p.length)]);
    photoRef.current.value = "";
  };

  const removePhoto = (i) => setPhotos(p=>p.filter((_,idx)=>idx!==i));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.clientName||!form.productType) return;
    setBusy(true);
    try {
      // Create order
      const order = await createOrder({ ...form, templateId: selectedTemplate?.id||null, customFields });
      // Auto-submit into workflow
      await api.submitOrder(order.id, "Przesłano do puli redaktorów");
      // Upload photos if any
      if (photos.length > 0) {
        setUploading(true);
        for (const photo of photos) {
          try { await api.uploadFile(order.id, photo); }
          catch (e) { toast(`Błąd uploadu "${photo.name}"`, "warning"); }
        }
        setUploading(false);
      }
      toast(`Zlecenie ${order.order_number} utworzone ✓`);
      navigate("/");
    } catch (err) {
      toast(err.response?.data?.error||"Błąd tworzenia zlecenia", "error");
    } finally { setBusy(false); }
  };

  const canSubmit = form.clientName && form.productType;

  return (
    <div style={{ maxWidth:620,margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:800,color:"#e2e8f0" }}>Nowe zlecenie</h2>
        <p style={{ margin:0,color:"#64748b",fontSize:14 }}>Wypełnij dane klienta i wybierz typ produktu</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:"grid",gap:20 }}>
        {/* Template selector */}
        <div style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:20 }}>
          <div style={{ fontSize:13,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12 }}>📋 Szablon produktu</div>
          {templates.length > 0 ? (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8 }}>
              {templates.map(t=>(
                <div key={t.id} onClick={()=>handleTemplateChange(t.id===selectedTemplate?.id?"":t.id)}
                  style={{ padding:"12px 14px",background:selectedTemplate?.id===t.id?"#1e3a5f":"#080d14",border:`1px solid ${selectedTemplate?.id===t.id?"#1d4ed8":"#1e293b"}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:selectedTemplate?.id===t.id?"#60a5fa":"#e2e8f0",marginBottom:4 }}>{t.name}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{t.product_type}</div>
                </div>
              ))}
              <div onClick={()=>handleTemplateChange("")}
                style={{ padding:"12px 14px",background:!selectedTemplate?"#0a1a0a":"#080d14",border:`1px solid ${!selectedTemplate?"#15803d":"#1e293b"}`,borderRadius:8,cursor:"pointer",transition:"all 0.15s" }}>
                <div style={{ fontSize:13,fontWeight:600,color:!selectedTemplate?"#22c55e":"#64748b" }}>Własny</div>
                <div style={{ fontSize:11,color:"#475569" }}>Bez szablonu</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:13,color:"#64748b" }}>Brak aktywnych szablonów. <span style={{ color:"#60a5fa",cursor:"pointer" }} onClick={()=>navigate("/admin/config")}>Utwórz w ustawieniach</span></div>
          )}
        </div>

        {/* Client data */}
        <div style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:20,display:"grid",gap:14 }}>
          <div style={{ fontSize:13,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>👤 Dane klienta</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}><Input label="Nazwa klienta" value={form.clientName} onChange={setF("clientName")} placeholder="Firma ABC Sp. z o.o." required/></div>
            <Input label="Email" type="email" value={form.clientEmail} onChange={setF("clientEmail")} placeholder="kontakt@firma.pl"/>
            <Input label="Telefon" value={form.clientPhone} onChange={setF("clientPhone")} placeholder="+48 123 456 789"/>
          </div>
          {!selectedTemplate&&<Input label="Typ produktu" value={form.productType} onChange={setF("productType")} placeholder="Katalog, Broszura, Roll-up..." required/>}
          <Input label="Uwagi klienta" value={form.clientNotes} onChange={setF("clientNotes")} placeholder="Styl, kolory, specjalne wymagania..." multiline rows={3}/>
        </div>

        {/* Custom fields from template */}
        {selectedTemplate?.fields_config?.length>0&&(
          <div style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:20,display:"grid",gap:14 }}>
            <div style={{ fontSize:13,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>⚙ Parametry — {selectedTemplate.name}</div>
            {selectedTemplate.fields_config.map(field=>(
              <DynamicField key={field.key} field={field} value={customFields[field.key]||""} onChange={setCF(field.key)}/>
            ))}
          </div>
        )}

        {/* Photo/file upload */}
        <div style={{ background:"#0d1117",border:"1px solid #1e293b",borderRadius:10,padding:20 }}>
          <div style={{ fontSize:13,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12 }}>📎 Materiały od klienta</div>
          <input ref={photoRef} type="file" multiple accept="image/*,.pdf,.zip,.ai,.psd,.docx" onChange={handlePhotoAdd} style={{ display:"none" }}/>
          
          {photos.length > 0 && (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,marginBottom:10 }}>
              {photos.map((photo,i)=>(
                <div key={i} style={{ position:"relative",background:"#080d14",border:"1px solid #1e293b",borderRadius:8,padding:"10px 8px" }}>
                  {photo.type.startsWith("image/")
                    ? <img src={URL.createObjectURL(photo)} alt="" style={{ width:"100%",height:60,objectFit:"cover",borderRadius:4,marginBottom:6 }}/>
                    : <div style={{ height:60,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:6 }}>📄</div>}
                  <div style={{ fontSize:10,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{photo.name}</div>
                  <div style={{ fontSize:10,color:"#475569" }}>{formatFileSize(photo.size)}</div>
                  <button onClick={()=>removePhoto(i)} type="button" style={{ position:"absolute",top:4,right:4,background:"#450a0a",border:"none",color:"#ef4444",width:18,height:18,borderRadius:"50%",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1 }}>✕</button>
                </div>
              ))}
              {photos.length < 5 && (
                <div onClick={()=>photoRef.current.click()} style={{ background:"#080d14",border:"1px dashed #334155",borderRadius:8,padding:"10px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:110,color:"#64748b",fontSize:12 }}>
                  <span style={{ fontSize:24,marginBottom:4 }}>＋</span>Dodaj
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <button type="button" onClick={()=>photoRef.current.click()} style={{ width:"100%",padding:14,background:"transparent",border:"1px dashed #334155",borderRadius:8,color:"#64748b",cursor:"pointer",fontSize:13,transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#60a5fa";e.currentTarget.style.color="#60a5fa"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.color="#64748b"}}>
              📎 Dodaj pliki / zdjęcia (max 5)
            </button>
          )}
        </div>

        {/* Submit */}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <Button variant="ghost" onClick={()=>navigate(-1)}>Anuluj</Button>
          <Button type="submit" variant="success" icon="→" loading={busy||(uploading)} disabled={!canSubmit}>
            {uploading?"Wgrywanie plików...":"Utwórz i wyślij do redaktorów"}
          </Button>
        </div>
      </form>
    </div>
  );
}
