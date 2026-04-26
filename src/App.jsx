import { useState, useEffect, useRef, useCallback } from "react";

// ─── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://litnauihwmilzyieucvn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdG5hdWlod21pbHp5aWV1Y3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzA0MjcsImV4cCI6MjA5MDAwNjQyN30.M5U7-42LshhxGoGpBAazJDojMWg0ZJOa4OaPRfLQzjI";
const H = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: H, ...opts });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── ANTHROPIC API – recept naam herkennen uit URL ─────────────────────────────
const ANTHROPIC_KEY = ""; // Optioneel: vul in voor AI-import functie
async function detectDishFromUrl(url) {
  // Probeer eerst de paginatitel te extraheren via een CORS-proxy
  let pageTitle = "";
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    const match = data.contents?.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) pageTitle = match[1].trim();
  } catch(e) { /* silent */ }

  // Haal gerechtnaam en categorie uit de URL + titel
  const categories = ["Pasta & Italiaans","Rijst & Aziatisch","Aardappels, Vlees & Groenten","Wraps & Mexicaans","Salades & Gezonde Bowls","Pizza, Burgers & Fastfood","Overig"];

  if (ANTHROPIC_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: `URL: ${url}\nPaginatitel: ${pageTitle}\n\nGeef de naam van het gerecht in het Nederlands (kort, zonder extra tekst) en de beste categorie uit deze lijst: ${categories.join(", ")}.\n\nAntwoord ALLEEN als JSON: {"name": "...", "category": "..."}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    try { return JSON.parse(text.match(/\{[^}]+\}/)?.[0] || "{}"); } catch(e) { /* fallback */ }
  }

  // Fallback: haal naam uit paginatitel of URL
  const name = pageTitle
    ? pageTitle.replace(/[-|–].*$/, "").replace(/recept/i, "").trim()
    : decodeURIComponent(url.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || "");
  return { name: name || "Nieuw gerecht", category: "Overig" };
}

// ─── SEED DATA ─────────────────────────────────────────────────────────────────
const SEED_DATA = {
  "Pasta & Italiaans": ["Lasagnette / Lasagne","Macaroni","Spaghetti (rode saus, gehakt, spekjes of kip)","Tortellini (spinazie, tomaat of pompoensaus)","Gnocchi (pesto, roomsaus, courgette of citroenkip)","Cannelloni (spinazie)","Verse pasta (asperges, spinazie of spinazie & spekjes)","Orzo","Pasta bolognese","Melanzane","Gevulde courgette / Gevulde paprika"],
  "Rijst & Aziatisch": ["Kip piri piri met rijst","Nasi (ook quinoa nasi)","Babi ketjap","Bami","Noodles met kipgehakt en wokgroenten","Risotto (ook met asperges of champignons)","Gele curry met rijst en naanbrood","Kip madras","Paella","Rijstevellen gevuld","Gebakken rijst met dumplings en oosterse kip","Biefstuk met wokgroenten en rijst","Gewokte garnalen met witlof en rijst"],
  "Aardappels, Vlees & Groenten": ["Pomme duchesse / Aardappeltorentjes","Gehaktballetjes in madeira roomsaus","Boerenkool stamppot","Andijviestamppot","Spruitjes stamppot","Stoofvlees (Zwolse stoof of pittig)","Biefstuk met broccoli en krieltjes","Kip uit de oven met broccoli en krieltjes","Varkenshaas met broccoli en aardappel","Gepaneerde kipfilet met wortel en pastinaak","Rosti ovenschotel met kip en witlof","Asperges met kriel, schnitzel en ei"],
  "Wraps & Mexicaans": ["Wraps (vega kip, avocado, mexicaans of kip)","Taco's","Mexicaanse salade (kipfilet of kipkrokant)","Texmex burrito","Tortilla's","Durum","Nacho schotel"],
  "Salades & Gezonde Bowls": ["Bulgur salade","Quinoa salade","Quinoa nasi","Salade met kipkrokant (mango of italiaans)","Salade met falafel","Haloumi salade","Bloemkoolrijst (vis of kip)","Couscous met kipfilet"],
  "Pizza, Burgers & Fastfood": ["Pizza (zelfgemaakt)","Patat / Ovenfrieten","Hamburger","Shoarma","Pita","Flammkuchen","Kofte","Chicken bites"],
  "Overig": ["Pannenkoeken","Gourmet","Hartige taart","Omelet (groenten, garnalen of kipgehakt)","Vissticks","Worstjes"]
};

const CAT_ICONS = {
  "Pasta & Italiaans":"🍝","Rijst & Aziatisch":"🍜","Aardappels, Vlees & Groenten":"🥩",
  "Wraps & Mexicaans":"🌯","Salades & Gezonde Bowls":"🥗","Pizza, Burgers & Fastfood":"🍕","Overig":"🍳"
};
const WEEK_DAYS       = ["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
const WEEK_DAYS_SHORT = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAYS_NL_SUN     = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];

function seededRandom(seed) { const x = Math.sin(seed)*10000; return x-Math.floor(x); }
function getDailySuggestion(dishes) {
  const all = Object.values(dishes).flat();
  if (!all.length) return null;
  const t = new Date();
  const seed = t.getFullYear()*10000+(t.getMonth()+1)*100+t.getDate();
  return all[Math.floor(seededRandom(seed)*all.length)];
}
function getWeekKey(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  d.setDate(d.getDate()+4-(d.getDay()||7));
  const y = new Date(d.getFullYear(),0,1);
  return `${d.getFullYear()}-W${String(Math.ceil((((d-y)/86400000)+1)/7)).padStart(2,"0")}`;
}
function getMonday(date = new Date()) {
  const d = new Date(date), day = d.getDay();
  d.setDate(d.getDate()+((day===0)?-6:1-day)); d.setHours(0,0,0,0); return d;
}
function isValidUrl(s) { try { new URL(s); return true; } catch { return false; } }

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx===-1) return <>{text}</>;
  return <>{text.slice(0,idx)}<mark style={{background:"#e8c547",borderRadius:3,padding:"0 2px"}}>{text.slice(idx,idx+query.length)}</mark>{text.slice(idx+query.length)}</>;
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dishes, setDishes]         = useState({});
  const [weekMenu, setWeekMenu]     = useState({});     // huidige week
  const [nextWeekMenu, setNextWeekMenu] = useState({}); // volgende week
  const [view, setView]             = useState("home");
  const [activeCategory, setActiveCategory] = useState(null);
  const [loaded, setLoaded]         = useState(false);
  const [status, setStatus]         = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [newDish, setNewDish]         = useState("");
  const [addingTo, setAddingTo]       = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [moveTarget, setMoveTarget]   = useState(null);

  const [dayPicker, setDayPicker]     = useState(null); // { dish, slot, wk }
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualDay, setManualDay]     = useState(null);
  const [manualSlot, setManualSlot]   = useState("main");
  const [manualWk, setManualWk]       = useState(null); // weekKey for manual add
  const [manualDish, setManualDish]   = useState("");
  const [saveToCatTarget, setSaveToCatTarget] = useState(null);
  const [clearTarget, setClearTarget] = useState(null); // weekKey to clear

  // ── RECEPT URL states ──────────────────────────────────────────────────────
  const [urlModal, setUrlModal]       = useState(null);
  const [urlInput, setUrlInput]       = useState("");
  const [showImport, setShowImport]   = useState(false);
  const [importUrl, setImportUrl]     = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  const searchRef = useRef(null);
  const today         = new Date();
  const weekKey       = getWeekKey(today);
  const monday        = getMonday(today);
  const nextMonday    = new Date(monday.getTime() + 7*86400000);
  const nextWeekKey   = getWeekKey(nextMonday);
  const todayWeekIdx  = today.getDay()===0 ? 6 : today.getDay()-1;
  const todayDayName  = DAYS_NL_SUN[today.getDay()];

  function flash(msg, dur=2200) { setStatus(msg); setTimeout(()=>setStatus(""), dur); }

  // ── LOAD ──────────────────────────────────────────────────────────────────
  const loadDishes = useCallback(async () => {
    const rows = await sbFetch("/dishes?select=id,category,name,recipe_url&order=created_at.asc");
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({ id: row.id, name: row.name, recipe_url: row.recipe_url || null });
    }
    setDishes(grouped);
    return grouped;
  }, []);

  const loadWeekMenu = useCallback(async () => {
    const rows = await sbFetch(
      `/week_menu?select=id,week_key,day_name,dish,kids_dish&week_key=in.(${weekKey},${nextWeekKey})`
    );
    const current = {}, next = {};
    for (const row of rows) {
      const entry = { id: row.id, dish: row.dish, kids_dish: row.kids_dish || null };
      if (row.week_key === weekKey) current[row.day_name] = entry;
      else next[row.day_name] = entry;
    }
    setWeekMenu(current);
    setNextWeekMenu(next);
  }, [weekKey, nextWeekKey]);

  useEffect(() => {
    async function init() {
      try {
        const grouped = await loadDishes();
        if (Object.keys(grouped).length === 0) {
          flash("📦 Eerste keer laden, gerechten worden toegevoegd...", 4000);
          const inserts = Object.entries(SEED_DATA).flatMap(([category, names]) =>
            names.map(name => ({ category, name }))
          );
          await sbFetch("/dishes", {
            method: "POST",
            headers: { ...H, "Prefer": "return=minimal" },
            body: JSON.stringify(inserts)
          });
          await loadDishes();
        }
        await loadWeekMenu();
      } catch(e) { flash("⚠ Verbinding mislukt: " + e.message, 5000); }
      setLoaded(true);
    }
    init();
  }, [loadDishes, loadWeekMenu]);

  // ── DISHES CRUD ───────────────────────────────────────────────────────────
  async function addDish() {
    if (!newDish.trim() || !addingTo) return;
    try {
      const [row] = await sbFetch("/dishes?select=id,category,name,recipe_url", {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify({ category: addingTo, name: newDish.trim() })
      });
      setDishes(prev => ({ ...prev, [addingTo]: [...(prev[addingTo]||[]), { id: row.id, name: row.name, recipe_url: null }] }));
      flash("✓ Opgeslagen");
    } catch(e) { flash("⚠ " + e.message); }
    setNewDish(""); setAddingTo(null);
  }

  async function removeDish(cat, id) {
    try {
      await sbFetch(`/dishes?id=eq.${id}`, { method: "DELETE" });
      setDishes(prev => ({ ...prev, [cat]: prev[cat].filter(d=>d.id!==id) }));
      flash("✓ Verwijderd");
    } catch(e) { flash("⚠ " + e.message); }
  }

  async function moveDish(item, fromCat, toCat) {
    if (fromCat===toCat) { setMoveTarget(null); return; }
    try {
      await sbFetch(`/dishes?id=eq.${item.id}`, {
        method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ category: toCat })
      });
      setDishes(prev => ({
        ...prev,
        [fromCat]: prev[fromCat].filter(d=>d.id!==item.id),
        [toCat]: [...(prev[toCat]||[]), item]
      }));
      flash("✓ Verplaatst");
    } catch(e) { flash("⚠ " + e.message); }
    setMoveTarget(null);
  }

  async function addCategory() {
    if (!newCategory.trim() || dishes[newCategory.trim()]) return;
    setDishes(prev => ({ ...prev, [newCategory.trim()]: [] }));
    flash("✓ Categorie aangemaakt");
    setNewCategory(""); setShowAddCategory(false);
  }

  // ── RECEPT URL CRUD ───────────────────────────────────────────────────────
  async function saveRecipeUrl(item, url) {
    const cleanUrl = url.trim() || null;
    try {
      await sbFetch(`/dishes?id=eq.${item.id}`, {
        method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ recipe_url: cleanUrl })
      });
      // Update local state
      setDishes(prev => {
        const updated = { ...prev };
        for (const cat of Object.keys(updated)) {
          updated[cat] = updated[cat].map(d => d.id === item.id ? { ...d, recipe_url: cleanUrl } : d);
        }
        return updated;
      });
      flash(cleanUrl ? "✓ Recept link opgeslagen" : "✓ Link verwijderd");
    } catch(e) { flash("⚠ " + e.message); }
    setUrlModal(null); setUrlInput("");
  }

  // ── URL IMPORT ────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!isValidUrl(importUrl.trim())) { flash("⚠ Voer een geldige URL in"); return; }
    setImportLoading(true);
    try {
      const result = await detectDishFromUrl(importUrl.trim());
      setImportPreview({ ...result, url: importUrl.trim() });
    } catch(e) { flash("⚠ Kon URL niet verwerken"); }
    setImportLoading(false);
  }

  async function confirmImport(name, category, url) {
    try {
      const [row] = await sbFetch("/dishes?select=id,category,name,recipe_url", {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify({ category, name, recipe_url: url })
      });
      setDishes(prev => ({ ...prev, [category]: [...(prev[category]||[]), { id: row.id, name: row.name, recipe_url: url }] }));
      flash("✓ Gerecht toegevoegd met recept link");
    } catch(e) { flash("⚠ " + e.message); }
    setShowImport(false); setImportUrl(""); setImportPreview(null);
  }

  // ── WEEK MENU CRUD ────────────────────────────────────────────────────────
  function getMenuState(wk) {
    return wk === weekKey
      ? { menu: weekMenu, setMenu: setWeekMenu }
      : { menu: nextWeekMenu, setMenu: setNextWeekMenu };
  }

  async function assignDishToDay(dish, dayName, slot = "main", wk = weekKey) {
    const { menu, setMenu } = getMenuState(wk);
    try {
      const existing = menu[dayName];
      const field = slot === "kids" ? "kids_dish" : "dish";
      if (existing) {
        await sbFetch(`/week_menu?id=eq.${existing.id}`, {
          method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
          body: JSON.stringify({ [field]: dish })
        });
        setMenu(prev => ({ ...prev, [dayName]: { ...prev[dayName], [field]: dish } }));
      } else {
        const [row] = await sbFetch("/week_menu?select=id,day_name,dish,kids_dish", {
          method: "POST", headers: { ...H, "Prefer": "return=representation" },
          body: JSON.stringify({ week_key: wk, day_name: dayName, [field]: dish })
        });
        setMenu(prev => ({ ...prev, [dayName]: { id: row.id, dish: row.dish, kids_dish: row.kids_dish || null } }));
      }
      flash("✓ Ingepland");
    } catch(e) { flash("⚠ " + e.message); }
    setDayPicker(null); setShowManualAdd(false); setManualDish(""); setManualDay(null);
  }

  async function removeFromDay(dayName, slot = "main", wk = weekKey) {
    const { menu, setMenu } = getMenuState(wk);
    const entry = menu[dayName];
    if (!entry) return;
    try {
      if (slot === "kids") {
        await sbFetch(`/week_menu?id=eq.${entry.id}`, {
          method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
          body: JSON.stringify({ kids_dish: null })
        });
        setMenu(prev => ({ ...prev, [dayName]: { ...prev[dayName], kids_dish: null } }));
      } else {
        if (!entry.kids_dish) {
          await sbFetch(`/week_menu?id=eq.${entry.id}`, { method: "DELETE" });
          setMenu(prev => { const n={...prev}; delete n[dayName]; return n; });
        } else {
          await sbFetch(`/week_menu?id=eq.${entry.id}`, {
            method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
            body: JSON.stringify({ dish: null })
          });
          setMenu(prev => ({ ...prev, [dayName]: { ...prev[dayName], dish: null } }));
        }
      }
      flash("✓ Verwijderd");
    } catch(e) { flash("⚠ " + e.message); }
  }

  async function clearWeek(wk) {
    const { setMenu } = getMenuState(wk);
    try {
      await sbFetch(`/week_menu?week_key=eq.${wk}`, { method: "DELETE" });
      setMenu({}); flash("✓ Week geleegd");
    } catch(e) { flash("⚠ " + e.message); }
    setClearTarget(null);
  }

  async function saveDishToCategory(dishName, cat) {
    const already = dishes[cat]?.some(d=>d.name===dishName);
    if (already) { setSaveToCatTarget(null); return; }
    try {
      const [row] = await sbFetch("/dishes?select=id,category,name,recipe_url", {
        method: "POST", headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify({ category: cat, name: dishName })
      });
      setDishes(prev => ({ ...prev, [cat]: [...(prev[cat]||[]), { id: row.id, name: row.name, recipe_url: null }] }));
      flash("✓ Opgeslagen in " + cat);
    } catch(e) { flash("⚠ " + e.message); }
    setSaveToCatTarget(null);
  }

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const flatDishes = Object.entries(dishes).flatMap(([cat,items])=>items.map(d=>({...d,cat})));
  const suggestion = loaded ? getDailySuggestion(
    Object.fromEntries(Object.entries(dishes).map(([c,items])=>[c,items.map(d=>d.name)]))
  ) : null;
  const suggestionCat = suggestion ? Object.entries(dishes).find(([,items])=>items.some(d=>d.name===suggestion))?.[0] : null;
  const searchResults = searchQuery.trim() ? flatDishes.filter(d=>d.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  function dayDate(idx) {
    const d = new Date(monday); d.setDate(d.getDate()+idx);
    return d.toLocaleDateString("nl-NL",{day:"numeric",month:"short"});
  }

  // ─── DISH ITEM component – used in category & search ──────────────────────
  function DishItem({ item, cat, onPlan, onMove, onRemove }) {
    return (
      <div className="dish-item" onClick={()=>onPlan("main")}>
        <span className="dish-name">{item.name}</span>
        <div className="dish-actions" onClick={e=>e.stopPropagation()}>
          {item.recipe_url ? (
            <a href={item.recipe_url} target="_blank" rel="noopener noreferrer" className="recipe-link-btn filled" title="Recept openen">
              🔗
            </a>
          ) : (
            <button className="recipe-link-btn" title="Recept link toevoegen"
              onClick={()=>{ setUrlInput(""); setUrlModal({item,cat}); }}>
              🔗
            </button>
          )}
          <button className="move-btn" onClick={()=>onMove()}>↗</button>
          <button className="remove-btn" onClick={()=>onRemove()}>×</button>
        </div>
      </div>
    );
  }

  // ── STYLES ────────────────────────────────────────────────────────────────
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#faf7f2}
    .app{min-height:100vh;background:#faf7f2;font-family:'DM Sans',sans-serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding-bottom:80px}
    .header{background:#1a1a1a;color:#faf7f2;padding:18px 20px 14px;position:sticky;top:0;z-index:100}
    .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .logo{font-family:'Playfair Display',serif;font-size:21px;font-weight:900;letter-spacing:-.5px}
    .logo span{color:#e8c547}
    .save-status{font-size:11px;color:#e8c547;font-weight:500;max-width:180px;text-align:right}
    .nav{display:flex;gap:3px}
    .nav-btn{flex:1;background:transparent;border:1.5px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.55);padding:7px 2px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:500;cursor:pointer;transition:all .2s;line-height:1.3}
    .nav-btn.active{background:#e8c547;border-color:#e8c547;color:#1a1a1a}

    .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:12px;color:#aaa;font-size:14px}
    .spinner{width:32px;height:32px;border:3px solid #ede9e0;border-top-color:#e8c547;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .home-section{padding:24px 20px 0}
    .day-label{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin-bottom:3px}
    .date-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;line-height:1.1;margin-bottom:18px}
    .suggestion-card{background:#1a1a1a;color:#faf7f2;border-radius:16px;padding:24px 22px;position:relative;overflow:hidden;cursor:pointer}
    .suggestion-card::before{content:'';position:absolute;top:-30px;right:-30px;width:110px;height:110px;background:#e8c547;border-radius:50%;opacity:.12}
    .suggestion-label{font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#e8c547;margin-bottom:8px}
    .suggestion-name{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;line-height:1.2;margin-bottom:8px}
    .suggestion-cat{font-size:12px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:6px}
    .suggestion-hint{font-size:11px;color:rgba(255,255,255,.3);margin-top:10px;display:flex;align-items:center;gap:5px}

    .section-title{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;margin:24px 20px 12px}
    .section-title-row{display:flex;align-items:center;justify-content:space-between;margin:24px 20px 12px}
    .section-title-row .section-title{margin:0}

    .category-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px}
    .cat-card{background:white;border:1.5px solid #ede9e0;border-radius:12px;padding:14px 13px;cursor:pointer;transition:all .2s;text-align:left}
    .cat-card:hover{border-color:#1a1a1a;transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.07)}
    .cat-icon{font-size:20px;margin-bottom:7px;display:block}
    .cat-name{font-size:12.5px;font-weight:500;line-height:1.3;margin-bottom:3px}
    .cat-count{font-size:11px;color:#aaa}
    .add-cat-btn{background:transparent;border:1.5px dashed #ccc;border-radius:12px;padding:14px 13px;cursor:pointer;font-size:12.5px;font-weight:500;color:#aaa;width:100%;display:flex;align-items:center;gap:8px;transition:all .2s;font-family:'DM Sans',sans-serif}
    .add-cat-btn:hover{border-color:#888;color:#555}

    .week-header{padding:20px 20px 0}
    .week-subtitle{font-size:12px;color:#999;margin-bottom:16px;margin-top:3px}
    .week-list{display:flex;flex-direction:column;padding:0 20px}
    .week-day-row{display:flex;align-items:stretch;border-bottom:1px solid #f0ece4;padding:10px 0;gap:12px}
    .week-day-row:last-child{border-bottom:none}
    .wday-col{width:44px;flex-shrink:0;display:flex;flex-direction:column;padding-top:2px}
    .wday-label{font-size:13px;font-weight:500;color:#555;line-height:1}
    .wday-label.today{color:#1a1a1a;font-weight:700}
    .wday-date{font-size:10.5px;color:#bbb;margin-top:2px}
    .wday-dot{width:6px;height:6px;background:#e8c547;border-radius:50%;margin-top:5px}
    .week-dish-col{flex:1;display:flex;flex-direction:column;gap:5px}
    .week-dish-filled{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:6px}
    .week-dish-filled.today{border-color:#e8c547;background:#fffdf0}
    .week-dish-filled.kids{border-color:#c8e6c9;background:#f9fef9}
    .week-dish-name{font-size:13px;font-weight:500;flex:1;line-height:1.3}
    .week-dish-label{font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#aaa;margin-bottom:1px}
    .week-dish-label.kids{color:#81c784}
    .week-add-kids{display:flex;align-items:center;gap:5px;padding:5px 0 2px;cursor:pointer;font-size:11.5px;color:#bbb;transition:color .15s;background:none;border:none;font-family:'DM Sans',sans-serif}
    .week-add-kids:hover{color:#81c784}
    .wday-actions{display:flex;gap:4px;flex-shrink:0}
    .week-empty-slot{flex:1;border:1.5px dashed #ddd;border-radius:10px;padding:9px 12px;display:flex;align-items:center;cursor:pointer;transition:all .15s;color:#ccc;font-size:13px;gap:6px}
    .week-empty-slot:hover{border-color:#aaa;color:#888;background:#faf7f2}
    .week-actions-row{display:flex;gap:8px;padding:16px 20px 0}
    .week-clear-btn{background:none;border:1.5px solid #f0ede8;border-radius:10px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
    .week-clear-btn:hover{border-color:#e04;color:#e04;background:#fff5f5}

    .day-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px}
    .day-opt{padding:10px 4px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;text-align:center;transition:all .15s;line-height:1.2}
    .day-opt:hover{border-color:#1a1a1a;background:#faf7f2}
    .day-opt.today-opt{border-color:#e8c547}
    .day-opt.has-dish{background:#faf7f2;border-color:#ddd;color:#aaa}
    .day-opt-date{font-size:10px;color:#aaa;font-weight:400;margin-top:2px}
    .day-opt-occupied{font-size:9px;color:#e8c547;margin-top:1px}

    .search-wrap{padding:14px 20px 0;position:relative}
    .search-icon{position:absolute;left:34px;top:26px;font-size:14px;color:#aaa;pointer-events:none}
    .search-input{width:100%;border:1.5px solid #ede9e0;border-radius:12px;padding:11px 38px 11px 36px;font-family:'DM Sans',sans-serif;font-size:14px;background:white;outline:none;transition:border-color .2s}
    .search-input:focus{border-color:#1a1a1a}
    .search-clear{position:absolute;right:32px;top:26px;background:#ddd;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;color:#555;display:flex;align-items:center;justify-content:center}
    .search-results{padding:8px 20px 0}
    .search-meta{font-size:11px;color:#aaa;margin-bottom:9px;padding-top:3px}

    .cat-header{padding:20px 20px 0}
    .cat-header-row{display:flex;align-items:center;justify-content:space-between}
    .back-btn{background:none;border:none;font-family:'DM Sans',sans-serif;font-size:13px;color:#888;cursor:pointer;padding:0;margin-bottom:10px;display:flex;align-items:center;gap:4px}
    .cat-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;display:flex;align-items:center;gap:10px}
    .import-btn{background:#1a1a1a;color:white;border:none;border-radius:10px;padding:8px 14px;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background .2s}
    .import-btn:hover{background:#333}

    .dish-list{padding:14px 20px;display:flex;flex-direction:column;gap:7px}
    .dish-item{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:10px 13px;display:flex;align-items:center;justify-content:space-between;font-size:13.5px;gap:8px;cursor:pointer;transition:border-color .15s}
    .dish-item:hover{border-color:#bbb}
    .dish-name{flex:1;line-height:1.3}
    .dish-actions{display:flex;gap:3px;flex-shrink:0;align-items:center}

    .recipe-link-btn{background:none;border:none;font-size:15px;cursor:pointer;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .15s;color:#ccc;text-decoration:none}
    .recipe-link-btn:hover{background:#f0ece4;color:#555}
    .recipe-link-btn.filled{color:#e8c547}
    .recipe-link-btn.filled:hover{background:#fff8e0}

    .move-btn{background:none;border:none;font-size:14px;cursor:pointer;color:#bbb;padding:0;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .15s}
    .move-btn:hover{color:#555;background:#f0ece4}
    .remove-btn{background:none;border:none;color:#ccc;font-size:17px;cursor:pointer;padding:0;width:26px;height:26px;display:flex;align-items:center;justify-content:center;transition:color .15s}
    .remove-btn:hover{color:#e05}

    .search-item{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;cursor:pointer;transition:border-color .15s}
    .search-item:hover{border-color:#ccc}
    .search-item-left{flex:1;min-width:0}
    .search-dish{font-size:13.5px;font-weight:500}
    .search-cat-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#888;margin-top:2px}
    .search-actions{display:flex;gap:5px;flex-shrink:0;align-items:center}
    .icon-btn{background:#f5f1ea;border:none;border-radius:8px;width:30px;height:30px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;text-decoration:none;color:inherit}
    .icon-btn:hover{background:#ede9e0}
    .icon-btn.filled{color:#e8c547}
    .icon-btn.danger:hover{background:#ffe5e5}

    .add-form{padding:0 20px;display:flex;gap:8px;margin-top:4px}
    .add-input{flex:1;border:1.5px solid #ede9e0;border-radius:10px;padding:11px 13px;font-family:'DM Sans',sans-serif;font-size:13.5px;background:white;outline:none;transition:border-color .2s}
    .add-input:focus{border-color:#1a1a1a}
    .add-submit{background:#1a1a1a;color:white;border:none;border-radius:10px;padding:11px 16px;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .2s}
    .add-submit:hover{background:#333}
    .add-trigger{background:none;border:1.5px dashed #ccc;border-radius:10px;padding:11px 13px;width:calc(100% - 40px);margin:7px 20px 0;display:flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:13.5px;color:#aaa;cursor:pointer;transition:all .2s}
    .add-trigger:hover{border-color:#888;color:#555}

    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;z-index:200}
    .modal{background:white;border-radius:20px 20px 0 0;padding:26px 20px 38px;width:100%;max-height:88vh;overflow-y:auto}
    .modal-title{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;margin-bottom:4px}
    .modal-sub{font-size:12.5px;color:#888;margin-bottom:16px}
    .modal-form{display:flex;gap:8px}
    .modal-section-label{font-size:11px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:9px}

    .url-preview{background:#faf7f2;border:1.5px solid #ede9e0;border-radius:10px;padding:14px;margin-bottom:14px}
    .url-preview-label{font-size:10px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
    .url-preview-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;margin-bottom:4px}
    .url-preview-cat{font-size:12px;color:#888;display:flex;align-items:center;gap:5px}
    .url-preview-edit{font-size:13px;margin-top:10px}
    .url-preview-edit input{width:100%;border:1.5px solid #ede9e0;border-radius:8px;padding:8px 11px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;margin-top:4px}
    .url-preview-edit input:focus{border-color:#1a1a1a}
    .url-preview-edit select{width:100%;border:1.5px solid #ede9e0;border-radius:8px;padding:8px 11px;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;margin-top:4px;background:white}

    .import-loading{text-align:center;padding:24px;color:#aaa;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px}

    .confirm-btns{display:flex;gap:10px;margin-top:16px}
    .btn-primary{background:#1a1a1a;color:white;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1}
    .btn-primary:hover{background:#333}
    .btn-danger{background:#e04040;color:white;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1}
    .btn-cancel{background:#f5f1ea;color:#555;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1}
    .btn-ghost{background:none;border:1.5px solid #ede9e0;color:#888;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer;flex:1}
    .btn-ghost:hover{border-color:#e04;color:#e04}

    .scroll-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px}
    .scroll-chips::-webkit-scrollbar{display:none}
    .chip{background:white;border:1.5px solid #ede9e0;border-radius:8px;padding:7px 11px;white-space:nowrap;font-family:'DM Sans',sans-serif;font-size:12.5px;cursor:pointer;flex-shrink:0;transition:all .15s}
    .chip:hover{border-color:#1a1a1a;background:#faf7f2}

    .list-scroll{display:flex;flex-direction:column;gap:7px;max-height:300px;overflow-y:auto}
    .list-opt{display:flex;align-items:center;gap:10px;padding:12px 13px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13.5px;transition:all .15s;text-align:left;width:100%}
    .list-opt:hover{border-color:#1a1a1a;background:#faf7f2}
    .list-opt.muted{opacity:.38;cursor:default;pointer-events:none;background:#f5f5f5}

    .empty{text-align:center;color:#bbb;padding:36px 20px;font-size:13.5px}
    .no-results{text-align:center;color:#bbb;padding:44px 20px 20px;font-size:13.5px}

    .autocomplete-list{display:flex;flex-direction:column;gap:5px;margin-bottom:8px;max-height:260px;overflow-y:auto}
    .autocomplete-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:11px 13px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:left;transition:all .15s;width:100%}
    .autocomplete-item:hover{border-color:#1a1a1a;background:#faf7f2}
    .autocomplete-name{font-size:14px;font-weight:500;color:#1a1a1a}
    .autocomplete-cat{font-size:11px;color:#aaa;margin-top:1px}
    .autocomplete-new{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 13px;border:1.5px dashed #e8c547;border-radius:10px;background:#fffdf0;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#888;text-align:left;width:100%;transition:all .15s;margin-top:4px}
    .autocomplete-new strong{color:#1a1a1a;font-size:14px}
    .autocomplete-new:hover{background:#fff8d0;border-color:#d4a800}
  `;

  // ── IMPORT PREVIEW component ───────────────────────────────────────────────
  const [previewName, setPreviewName]   = useState("");
  const [previewCat, setPreviewCat]     = useState("");
  useEffect(() => {
    if (importPreview) { setPreviewName(importPreview.name); setPreviewCat(importPreview.category); }
  }, [importPreview]);

  if (!loaded) return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header"><div className="header-top"><div className="logo">Avond<span>Eten</span></div></div></div>
        <div className="loading"><div className="spinner"/><div>Verbinding maken met database...</div></div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* HEADER */}
        <div className="header">
          <div className="header-top">
            <div className="logo">Avond<span>Eten</span></div>
            <div className="save-status">{status}</div>
          </div>
          <div className="nav">
            {[["home","🏠","Vandaag"],["week","📅","Week"],["browse","📋","Bladeren"],["search","🔍","Zoeken"]].map(([v,icon,label])=>(
              <button key={v} className={`nav-btn ${(view===v||(v==="browse"&&view==="category"))?"active":""}`}
                onClick={()=>{setView(v);if(v==="search")setTimeout(()=>searchRef.current?.focus(),60);}}>
                {icon}<br/>{label}
              </button>
            ))}
          </div>
        </div>

        {/* ── VANDAAG ── */}
        {view==="home" && <>
          <div className="home-section">
            <div className="day-label">{DAYS_NL_SUN[today.getDay()]} · {today.toLocaleDateString("nl-NL",{day:"numeric",month:"long"})}</div>
            <div className="date-title">Wat eten we vanavond?</div>
            {weekMenu[todayDayName] ? (
              <div className="suggestion-card" style={{cursor:"default"}}>
                <div className="suggestion-label">📅 Gepland voor vandaag</div>
                <div className="suggestion-name">{weekMenu[todayDayName].dish}</div>
                <div className="suggestion-cat"><span>✓</span><span>Staat in het weekmenu</span></div>
              </div>
            ) : suggestion ? (
              <div className="suggestion-card" onClick={()=>setDayPicker({dish:suggestion, slot:"main"})}>
                <div className="suggestion-label">✦ Suggestie van de dag</div>
                <div className="suggestion-name">{suggestion}</div>
                <div className="suggestion-cat"><span>{CAT_ICONS[suggestionCat]||"🍽"}</span><span>{suggestionCat}</span></div>
                <div className="suggestion-hint"><span>📅</span><span>Tik om in te plannen</span></div>
              </div>
            ) : (
              <div className="suggestion-card" style={{cursor:"default"}}><div className="suggestion-name">Voeg gerechten toe!</div></div>
            )}
          </div>
          <div className="section-title">Categorieën</div>
          <div className="category-grid">
            {Object.entries(dishes).map(([cat,items])=>(
              <button key={cat} className="cat-card" onClick={()=>{setActiveCategory(cat);setView("category");}}>
                <span className="cat-icon">{CAT_ICONS[cat]||"🍽"}</span>
                <div className="cat-name">{cat}</div>
                <div className="cat-count">{items.length} gerechten</div>
              </button>
            ))}
          </div>
        </>}

        {/* ── WEEK ── */}
        {view==="week" && (() => {
          function dayDateFor(startMonday, idx) {
            const d = new Date(startMonday); d.setDate(d.getDate()+idx);
            return d.toLocaleDateString("nl-NL",{day:"numeric",month:"short"});
          }

          function WeekSection({ label, wk, menu, startMonday, showToday }) {
            const wkNum = wk.split("-W")[1];
            const endDate = new Date(startMonday.getTime()+6*86400000);
            return (
              <div style={{marginBottom:8}}>
                {/* Week header */}
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",padding:"20px 20px 2px"}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,lineHeight:1}}>{label}</div>
                    <div style={{fontSize:11.5,color:"#aaa",marginTop:3}}>
                      {startMonday.toLocaleDateString("nl-NL",{day:"numeric",month:"long"})} – {endDate.toLocaleDateString("nl-NL",{day:"numeric",month:"long"})} &nbsp;·&nbsp; week {wkNum}
                    </div>
                  </div>
                  <button className="week-clear-btn" style={{padding:"6px 10px",fontSize:12}} onClick={()=>setClearTarget(wk)}>🗑</button>
                </div>

                {/* Days */}
                <div className="week-list" style={{paddingTop:10}}>
                  {WEEK_DAYS.map((day,idx)=>{
                    const isToday = showToday && idx===todayWeekIdx;
                    const entry = menu[day];
                    const mainDish = entry?.dish || null;
                    const kidsDish = entry?.kids_dish || null;
                    const linkedMain = mainDish ? flatDishes.find(d=>d.name===mainDish) : null;
                    const linkedKids = kidsDish ? flatDishes.find(d=>d.name===kidsDish) : null;
                    return (
                      <div key={day} className="week-day-row">
                        <div className="wday-col">
                          <div className={`wday-label ${isToday?"today":""}`}>{WEEK_DAYS_SHORT[idx]}</div>
                          <div className="wday-date">{dayDateFor(startMonday,idx)}</div>
                          {isToday && <div className="wday-dot"/>}
                        </div>
                        <div className="week-dish-col">
                          {mainDish ? (
                            <div className={`week-dish-filled ${isToday?"today":""}`}>
                              <div style={{flex:1,minWidth:0}}>
                                <div className="week-dish-name">{mainDish}</div>
                              </div>
                              <div className="wday-actions">
                                {linkedMain?.recipe_url && (
                                  <a href={linkedMain.recipe_url} target="_blank" rel="noopener noreferrer"
                                    className="icon-btn filled" onClick={e=>e.stopPropagation()}>🔗</a>
                                )}
                                <button className="icon-btn" onClick={()=>setSaveToCatTarget(mainDish)}>💾</button>
                                <button className="icon-btn danger" onClick={()=>removeFromDay(day,"main",wk)}>×</button>
                              </div>
                            </div>
                          ) : (
                            <div className="week-empty-slot" onClick={()=>{setManualDay(day);setManualSlot("main");setManualWk(wk);setShowManualAdd(true);}}>
                              <span>＋</span><span>Gerecht toevoegen</span>
                            </div>
                          )}
                          {mainDish && (
                            kidsDish ? (
                              <div className="week-dish-filled kids">
                                <div style={{flex:1,minWidth:0}}>
                                  <div className="week-dish-label kids">👶 Kinderen</div>
                                  <div className="week-dish-name" style={{fontSize:12.5}}>{kidsDish}</div>
                                </div>
                                <div className="wday-actions">
                                  {linkedKids?.recipe_url && (
                                    <a href={linkedKids.recipe_url} target="_blank" rel="noopener noreferrer"
                                      className="icon-btn filled" onClick={e=>e.stopPropagation()}>🔗</a>
                                  )}
                                  <button className="icon-btn" onClick={()=>setSaveToCatTarget(kidsDish)}>💾</button>
                                  <button className="icon-btn danger" onClick={()=>removeFromDay(day,"kids",wk)}>×</button>
                                </div>
                              </div>
                            ) : (
                              <button className="week-add-kids" onClick={()=>{setManualDay(day);setManualSlot("kids");setManualWk(wk);setShowManualAdd(true);}}>
                                <span>＋</span><span>Kinderen eten iets anders</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <>
              <WeekSection label="Deze week" wk={weekKey} menu={weekMenu} startMonday={monday} showToday={true}/>
              <div style={{height:1,background:"#ede9e0",margin:"8px 20px 0"}}/>
              <WeekSection label="Volgende week" wk={nextWeekKey} menu={nextWeekMenu} startMonday={nextMonday} showToday={false}/>
            </>
          );
        })()}

        {/* ── BLADEREN ── */}
        {view==="browse" && <>
          <div className="section-title" style={{marginTop:18}}>Alle categorieën</div>
          <div className="category-grid">
            {Object.entries(dishes).map(([cat,items])=>(
              <button key={cat} className="cat-card" onClick={()=>{setActiveCategory(cat);setView("category");}}>
                <span className="cat-icon">{CAT_ICONS[cat]||"🍽"}</span>
                <div className="cat-name">{cat}</div>
                <div className="cat-count">{items.length} gerechten</div>
              </button>
            ))}
            <button className="add-cat-btn" onClick={()=>setShowAddCategory(true)}>
              <span>＋</span>Nieuwe categorie
            </button>
          </div>
        </>}

        {/* ── CATEGORIE DETAIL ── */}
        {view==="category" && activeCategory && <>
          <div className="cat-header">
            <button className="back-btn" onClick={()=>setView("browse")}>← Terug</button>
            <div className="cat-header-row">
              <div className="cat-title"><span>{CAT_ICONS[activeCategory]||"🍽"}</span><span>{activeCategory}</span></div>
              <button className="import-btn" onClick={()=>{ setImportPreview(null); setImportUrl(""); setShowImport(true); }}>
                🔗 URL importeren
              </button>
            </div>
          </div>
          <div className="dish-list">
            {!dishes[activeCategory]?.length && <div className="empty">Nog geen gerechten</div>}
            {dishes[activeCategory]?.map(item=>(
              <DishItem key={item.id} item={item} cat={activeCategory}
                onPlan={(slot)=>setDayPicker({dish:item.name, slot})}
                onMove={()=>setMoveTarget({item,fromCat:activeCategory})}
                onRemove={()=>removeDish(activeCategory,item.id)}
              />
            ))}
          </div>
          {addingTo===activeCategory ? (
            <div className="add-form">
              <input className="add-input" placeholder="Naam gerecht..." value={newDish} onChange={e=>setNewDish(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addDish()} autoFocus/>
              <button className="add-submit" onClick={addDish}>Toevoegen</button>
            </div>
          ) : (
            <button className="add-trigger" onClick={()=>setAddingTo(activeCategory)}>＋ Gerecht toevoegen</button>
          )}
        </>}

        {/* ── ZOEKEN ── */}
        {view==="search" && <>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input ref={searchRef} className="search-input" placeholder="Zoek een gerecht..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
            {searchQuery && <button className="search-clear" onClick={()=>setSearchQuery("")}>×</button>}
          </div>
          <div className="search-results">
            {!searchQuery.trim() && <div className="no-results">Typ om te zoeken in alle gerechten</div>}
            {searchQuery.trim() && !searchResults.length && <div className="no-results">Geen resultaten voor "<strong>{searchQuery}</strong>"</div>}
            {searchResults.length>0 && <>
              <div className="search-meta">{searchResults.length} gerecht{searchResults.length!==1?"en":""} gevonden</div>
              {searchResults.map(item=>(
                <div key={item.id} className="search-item" onClick={()=>setDayPicker({dish:item.name, slot:"main"})}>
                  <div className="search-item-left">
                    <div className="search-dish"><Highlight text={item.name} query={searchQuery}/></div>
                    <div className="search-cat-badge"><span>{CAT_ICONS[item.cat]||"🍽"}</span><span>{item.cat}</span></div>
                  </div>
                  <div className="search-actions" onClick={e=>e.stopPropagation()}>
                    {item.recipe_url ? (
                      <a href={item.recipe_url} target="_blank" rel="noopener noreferrer" className="icon-btn filled" title="Recept openen">🔗</a>
                    ) : (
                      <button className="icon-btn" title="Link toevoegen" onClick={()=>{setUrlInput("");setUrlModal({item,cat:item.cat});}}>🔗</button>
                    )}
                    <button className="icon-btn" onClick={()=>setMoveTarget({item,fromCat:item.cat})}>↗️</button>
                    <button className="icon-btn danger" onClick={()=>removeDish(item.cat,item.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </>}
          </div>
        </>}

        {/* ── URL LINK MODAL (koppelen aan bestaand gerecht) ── */}
        {urlModal && (
          <div className="modal-overlay" onClick={()=>setUrlModal(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Recept link</div>
              <div className="modal-sub">"{urlModal.item.name}"</div>
              <div className="modal-form" style={{flexDirection:"column",gap:10}}>
                <input className="add-input" placeholder="https://www.ah.nl/allerhande/recept/..." value={urlInput}
                  onChange={e=>setUrlInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&saveRecipeUrl(urlModal.item,urlInput)}
                  autoFocus style={{width:"100%"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn-primary" onClick={()=>saveRecipeUrl(urlModal.item,urlInput)}>
                    {urlInput.trim() ? "Opslaan" : "Link verwijderen"}
                  </button>
                  {urlModal.item.recipe_url && (
                    <button className="btn-ghost" onClick={()=>saveRecipeUrl(urlModal.item,"")}>Verwijderen</button>
                  )}
                </div>
              </div>
              {urlModal.item.recipe_url && (
                <div style={{marginTop:14,fontSize:12,color:"#aaa"}}>
                  Huidige link: <a href={urlModal.item.recipe_url} target="_blank" rel="noopener noreferrer"
                    style={{color:"#e8c547",wordBreak:"break-all"}}>{urlModal.item.recipe_url}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── URL IMPORT MODAL (nieuw gerecht via URL) ── */}
        {showImport && (
          <div className="modal-overlay" onClick={()=>{if(!importLoading){setShowImport(false);setImportPreview(null);setImportUrl("");}}}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Recept importeren</div>
              <div className="modal-sub">Plak een link van AH, Jumbo, Allerhande, 24kitchen, etc.</div>

              {!importPreview && !importLoading && (
                <div className="modal-form">
                  <input className="add-input" placeholder="https://..." value={importUrl}
                    onChange={e=>setImportUrl(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleImport()} autoFocus/>
                  <button className="add-submit" onClick={handleImport}>Haal op</button>
                </div>
              )}

              {importLoading && (
                <div className="import-loading">
                  <div className="spinner"/>
                  <div>Recept ophalen...</div>
                </div>
              )}

              {importPreview && !importLoading && (
                <>
                  <div className="url-preview">
                    <div className="url-preview-label">✦ Herkend gerecht</div>
                    <div className="url-preview-edit">
                      <div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Naam</div>
                      <input value={previewName} onChange={e=>setPreviewName(e.target.value)}/>
                    </div>
                    <div className="url-preview-edit" style={{marginTop:8}}>
                      <div style={{fontSize:11,color:"#aaa",marginBottom:3}}>Categorie</div>
                      <select value={previewCat} onChange={e=>setPreviewCat(e.target.value)}>
                        {Object.keys(dishes).map(c=><option key={c} value={c}>{CAT_ICONS[c]||"🍽"} {c}</option>)}
                      </select>
                    </div>
                    <div style={{marginTop:10,fontSize:11,color:"#bbb",wordBreak:"break-all"}}>
                      🔗 {importPreview.url}
                    </div>
                  </div>
                  <div className="confirm-btns">
                    <button className="btn-cancel" onClick={()=>setImportPreview(null)}>← Terug</button>
                    <button className="btn-primary" onClick={()=>confirmImport(previewName,previewCat,importPreview.url)}>
                      Toevoegen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── DAY PICKER MODAL ── */}
        {dayPicker && (
          <div className="modal-overlay" onClick={()=>setDayPicker(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Inplannen</div>
              <div className="modal-sub">
                "{dayPicker.dish}"
                {dayPicker.slot === "kids" && <span style={{marginLeft:6,fontSize:11,color:"#81c784",fontWeight:600}}>👶 Kinderen</span>}
              </div>

              {/* Deze week */}
              <div className="modal-section-label" style={{marginBottom:8}}>Deze week</div>
              <div className="day-grid" style={{marginBottom:16}}>
                {WEEK_DAYS.map((day,idx)=>{
                  const isToday = idx===todayWeekIdx;
                  const hasDish = dayPicker.slot==="kids" ? !!weekMenu[day]?.kids_dish : !!weekMenu[day]?.dish;
                  return (
                    <button key={day} className={`day-opt ${hasDish?"has-dish":""} ${isToday?"today-opt":""}`}
                      onClick={()=>assignDishToDay(dayPicker.dish, day, dayPicker.slot||"main", weekKey)}>
                      {WEEK_DAYS_SHORT[idx]}
                      <div className="day-opt-date">{dayDate(idx)}</div>
                      {hasDish && <div className="day-opt-occupied">bezet</div>}
                    </button>
                  );
                })}
              </div>

              {/* Volgende week */}
              <div className="modal-section-label" style={{marginBottom:8}}>Volgende week</div>
              <div className="day-grid">
                {WEEK_DAYS.map((day,idx)=>{
                  const d = new Date(nextMonday); d.setDate(d.getDate()+idx);
                  const dateStr = d.toLocaleDateString("nl-NL",{day:"numeric",month:"short"});
                  const hasDish = dayPicker.slot==="kids" ? !!nextWeekMenu[day]?.kids_dish : !!nextWeekMenu[day]?.dish;
                  return (
                    <button key={day} className={`day-opt ${hasDish?"has-dish":""}`}
                      onClick={()=>assignDishToDay(dayPicker.dish, day, dayPicker.slot||"main", nextWeekKey)}>
                      {WEEK_DAYS_SHORT[idx]}
                      <div className="day-opt-date">{dateStr}</div>
                      {hasDish && <div className="day-opt-occupied">bezet</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MANUAL ADD TO WEEK MODAL ── */}
        {showManualAdd && manualDay && (() => {
          const q = manualDish.trim().toLowerCase();
          const suggestions = q.length > 0
            ? flatDishes.filter(d => d.name.toLowerCase().includes(q)).slice(0, 6)
            : [];
          const exactMatch = flatDishes.some(d => d.name.toLowerCase() === q);
          const isNew = q.length > 0 && !exactMatch;
          return (
            <div className="modal-overlay" onClick={()=>{setShowManualAdd(false);setManualDay(null);setManualDish("");}}>
              <div className="modal" onClick={e=>e.stopPropagation()}>
                <div className="modal-title">Gerecht toevoegen</div>
                <div className="modal-sub">
                  {manualDay}
                  {manualSlot === "kids" && <span style={{marginLeft:6,fontSize:11,color:"#81c784",fontWeight:600}}>👶 Kinderen</span>}
                </div>

                <div style={{position:"relative",marginBottom:8}}>
                  <input
                    className="add-input" style={{width:"100%"}}
                    placeholder="Typ om te zoeken of nieuw gerecht..."
                    value={manualDish}
                    onChange={e=>setManualDish(e.target.value)}
                    onKeyDown={e=>{
                      if (e.key==="Enter" && manualDish.trim()) {
                        assignDishToDay(manualDish.trim(), manualDay, manualSlot, manualWk);
                        setManualDish("");
                      }
                    }}
                    autoFocus
                  />
                </div>

                {suggestions.length > 0 && (
                  <div className="autocomplete-list">
                    {suggestions.map(item=>(
                      <button key={item.id} className="autocomplete-item"
                        onClick={()=>{ assignDishToDay(item.name, manualDay, manualSlot, manualWk); setManualDish(""); }}>
                        <span className="autocomplete-name"><Highlight text={item.name} query={manualDish.trim()}/></span>
                        <span className="autocomplete-cat">{CAT_ICONS[item.cat]||"🍽"} {item.cat}</span>
                      </button>
                    ))}
                  </div>
                )}

                {isNew && (
                  <button className="autocomplete-new"
                    onClick={()=>{ assignDishToDay(manualDish.trim(), manualDay, manualSlot, manualWk); setManualDish(""); }}>
                    <span>＋ Toevoegen als nieuw gerecht:</span>
                    <strong>"{manualDish.trim()}"</strong>
                  </button>
                )}

                {!manualDish.trim() && (
                  <div style={{color:"#bbb",fontSize:13,textAlign:"center",padding:"20px 0"}}>
                    Begin te typen om te zoeken...
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── SAVE TO CATEGORY MODAL ── */}
        {saveToCatTarget && (
          <div className="modal-overlay" onClick={()=>setSaveToCatTarget(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Opslaan in catalogus</div>
              <div className="modal-sub">"{saveToCatTarget}"</div>
              <div className="list-scroll">
                {Object.entries(dishes).map(([cat,items])=>{
                  const already = items.some(d=>d.name===saveToCatTarget);
                  return (
                    <button key={cat} className={`list-opt ${already?"muted":""}`} onClick={()=>saveDishToCategory(saveToCatTarget,cat)}>
                      <span style={{fontSize:18}}>{CAT_ICONS[cat]||"🍽"}</span>
                      <span style={{flex:1}}>{cat}</span>
                      {already && <span style={{fontSize:11,color:"#bbb"}}>al aanwezig</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VERPLAATS MODAL ── */}
        {moveTarget && (
          <div className="modal-overlay" onClick={()=>setMoveTarget(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Verplaats gerecht</div>
              <div className="modal-sub">"{moveTarget.item.name}"</div>
              <div className="list-scroll">
                {Object.keys(dishes).map(cat=>(
                  <button key={cat} className={`list-opt ${cat===moveTarget.fromCat?"muted":""}`} onClick={()=>moveDish(moveTarget.item,moveTarget.fromCat,cat)}>
                    <span style={{fontSize:18}}>{CAT_ICONS[cat]||"🍽"}</span>
                    <span style={{flex:1}}>{cat}</span>
                    {cat===moveTarget.fromCat && <span style={{fontSize:11,color:"#bbb"}}>huidig</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NIEUWE CATEGORIE MODAL ── */}
        {showAddCategory && (
          <div className="modal-overlay" onClick={()=>setShowAddCategory(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Nieuwe categorie</div>
              <div className="modal-form">
                <input className="add-input" placeholder="Naam categorie..." value={newCategory} onChange={e=>setNewCategory(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCategory()} autoFocus/>
                <button className="add-submit" onClick={addCategory}>Aanmaken</button>
              </div>
            </div>
          </div>
        )}

        {/* ── WEEK LEEGMAKEN CONFIRM ── */}
        {clearTarget && (
          <div className="modal-overlay" onClick={()=>setClearTarget(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">{clearTarget===weekKey?"Deze week":"Volgende week"} legen?</div>
              <div className="modal-sub">Alle geplande gerechten worden verwijderd. Dit kan niet ongedaan worden gemaakt.</div>
              <div className="confirm-btns">
                <button className="btn-cancel" onClick={()=>setClearTarget(null)}>Annuleren</button>
                <button className="btn-danger" onClick={()=>clearWeek(clearTarget)}>Ja, legen</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
