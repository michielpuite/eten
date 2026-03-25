import { useState, useEffect, useRef } from "react";

const INITIAL_DATA = {
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

// Week starts Monday
const WEEK_DAYS = ["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
const WEEK_DAYS_SHORT = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAYS_NL_SUN = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];

function seededRandom(seed) { let x = Math.sin(seed)*10000; return x-Math.floor(x); }
function getDailySuggestion(dishes) {
  const all = Object.values(dishes).flat();
  if (!all.length) return null;
  const t = new Date();
  const seed = t.getFullYear()*10000+(t.getMonth()+1)*100+t.getDate();
  return all[Math.floor(seededRandom(seed)*all.length)];
}

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return <>{text.slice(0,idx)}<mark style={{background:"#e8c547",borderRadius:3,padding:"0 2px"}}>{text.slice(idx,idx+query.length)}</mark>{text.slice(idx+query.length)}</>;
}

// Get current week key: "YYYY-Www"
function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const yearStart = new Date(d.getFullYear(),0,1);
  const weekNo = Math.ceil((((d-yearStart)/86400000)+1)/7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

// Get Monday of current week
function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

export default function App() {
  const [dishes, setDishes] = useState(INITIAL_DATA);
  const [view, setView] = useState("home"); // home | browse | category | search | week
  const [activeCategory, setActiveCategory] = useState(null);
  const [newDish, setNewDish] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingTo, setAddingTo] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moveTarget, setMoveTarget] = useState(null);

  // Week menu: { "YYYY-Www": { "Maandag": "dish or null", ... } }
  const [weekMenus, setWeekMenus] = useState({});
  // Day picker: { dish, source: "catalog"|"manual" }
  const [dayPicker, setDayPicker] = useState(null);
  // Manual add to week
  const [manualDish, setManualDish] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  // Save to category from week
  const [saveToCatTarget, setSaveToCatTarget] = useState(null); // dish string
  // Confirm clear
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const searchRef = useRef(null);
  const today = new Date();
  const weekKey = getWeekKey(today);
  const monday = getMonday(today);
  const todayDayName = DAYS_NL_SUN[today.getDay()];
  // map sunday=0 -> index in WEEK_DAYS: Mon=0..Sun=6
  const todayWeekIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const currentWeek = weekMenus[weekKey] || {};

  // Load
  useEffect(() => {
    async function load() {
      try {
        const r1 = await window.storage.get("avondeten-dishes", true);
        if (r1?.value) setDishes(JSON.parse(r1.value));
      } catch(e) {}
      try {
        const r2 = await window.storage.get("avondeten-weekmenus", true);
        if (r2?.value) setWeekMenus(JSON.parse(r2.value));
      } catch(e) {}
      setLoaded(true);
    }
    load();
  }, []);

  async function saveDishes(d) {
    try {
      await window.storage.set("avondeten-dishes", JSON.stringify(d), true);
      flash("✓ Opgeslagen");
    } catch(e) { flash("⚠ Opslaan mislukt"); }
  }

  async function saveWeeks(w) {
    try {
      await window.storage.set("avondeten-weekmenus", JSON.stringify(w), true);
      flash("✓ Opgeslagen");
    } catch(e) { flash("⚠ Opslaan mislukt"); }
  }

  function flash(msg) {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(""), 2200);
  }

  // Dishes CRUD
  function addDish() {
    if (!newDish.trim() || !addingTo) return;
    const updated = { ...dishes, [addingTo]: [...(dishes[addingTo]||[]), newDish.trim()] };
    setDishes(updated); saveDishes(updated);
    setNewDish(""); setAddingTo(null);
  }
  function removeDish(cat, dish) {
    const updated = { ...dishes, [cat]: dishes[cat].filter(d=>d!==dish) };
    setDishes(updated); saveDishes(updated);
  }
  function moveDish(dish, fromCat, toCat) {
    if (fromCat===toCat) { setMoveTarget(null); return; }
    const updated = { ...dishes, [fromCat]: dishes[fromCat].filter(d=>d!==dish), [toCat]: [...(dishes[toCat]||[]), dish] };
    setDishes(updated); saveDishes(updated); setMoveTarget(null);
  }
  function addCategory() {
    if (!newCategory.trim() || dishes[newCategory.trim()]) return;
    const updated = { ...dishes, [newCategory.trim()]: [] };
    setDishes(updated); saveDishes(updated);
    setNewCategory(""); setShowAddCategory(false);
  }

  // Week menu CRUD
  function assignDishToDay(dish, dayName) {
    const updated = { ...weekMenus, [weekKey]: { ...currentWeek, [dayName]: dish } };
    setWeekMenus(updated); saveWeeks(updated);
    setDayPicker(null); setShowManualAdd(false); setManualDish("");
  }
  function removeFromDay(dayName) {
    const week = { ...currentWeek };
    delete week[dayName];
    const updated = { ...weekMenus, [weekKey]: week };
    setWeekMenus(updated); saveWeeks(updated);
  }
  function clearWeek() {
    const updated = { ...weekMenus, [weekKey]: {} };
    setWeekMenus(updated); saveWeeks(updated);
    setShowClearConfirm(false);
  }
  function saveDishToCategory(dish, cat) {
    if (!dish || !cat || dishes[cat]?.includes(dish)) { setSaveToCatTarget(null); return; }
    const updated = { ...dishes, [cat]: [...(dishes[cat]||[]), dish] };
    setDishes(updated); saveDishes(updated); setSaveToCatTarget(null);
  }

  const suggestion = loaded ? getDailySuggestion(dishes) : null;
  const suggestionCat = suggestion ? Object.entries(dishes).find(([,v])=>v.includes(suggestion))?.[0] : null;

  const searchResults = searchQuery.trim()
    ? Object.entries(dishes).flatMap(([cat,items]) =>
        items.filter(d=>d.toLowerCase().includes(searchQuery.toLowerCase())).map(dish=>({dish,cat})))
    : [];

  // Date labels for week
  function dayDate(idx) {
    const d = new Date(monday);
    d.setDate(d.getDate() + idx);
    return d.toLocaleDateString("nl-NL", { day:"numeric", month:"short" });
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#faf7f2}
    .app{min-height:100vh;background:#faf7f2;font-family:'DM Sans',sans-serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding-bottom:80px}

    /* HEADER */
    .header{background:#1a1a1a;color:#faf7f2;padding:18px 20px 14px;position:sticky;top:0;z-index:100}
    .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .logo{font-family:'Playfair Display',serif;font-size:21px;font-weight:900;letter-spacing:-.5px}
    .logo span{color:#e8c547}
    .save-status{font-size:11px;color:#e8c547;font-weight:500}
    .nav{display:flex;gap:3px}
    .nav-btn{flex:1;background:transparent;border:1.5px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.55);padding:7px 2px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:500;cursor:pointer;transition:all .2s;line-height:1.3}
    .nav-btn.active{background:#e8c547;border-color:#e8c547;color:#1a1a1a}

    /* HOME */
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
    .category-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px}
    .cat-card{background:white;border:1.5px solid #ede9e0;border-radius:12px;padding:14px 13px;cursor:pointer;transition:all .2s;text-align:left}
    .cat-card:hover{border-color:#1a1a1a;transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.07)}
    .cat-icon{font-size:20px;margin-bottom:7px;display:block}
    .cat-name{font-size:12.5px;font-weight:500;line-height:1.3;margin-bottom:3px}
    .cat-count{font-size:11px;color:#aaa}
    .add-cat-btn{background:transparent;border:1.5px dashed #ccc;border-radius:12px;padding:14px 13px;cursor:pointer;font-size:12.5px;font-weight:500;color:#aaa;width:100%;display:flex;align-items:center;gap:8px;transition:all .2s;font-family:'DM Sans',sans-serif}
    .add-cat-btn:hover{border-color:#888;color:#555}

    /* WEEK */
    .week-header{padding:20px 20px 0}
    .week-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
    .week-subtitle{font-size:12px;color:#999;margin-bottom:16px}
    .week-list{display:flex;flex-direction:column;gap:0;padding:0 20px}
    .week-day-row{display:flex;align-items:stretch;border-bottom:1px solid #f0ece4;padding:10px 0;gap:12px}
    .week-day-row:last-child{border-bottom:none}
    .week-day-row.today-row .wday-label{color:#1a1a1a;font-weight:700}
    .wday-col{width:48px;flex-shrink:0;display:flex;flex-direction:column;padding-top:2px}
    .wday-label{font-size:13px;font-weight:500;color:#555;line-height:1}
    .wday-date{font-size:10.5px;color:#bbb;margin-top:2px}
    .wday-today-dot{width:6px;height:6px;background:#e8c547;border-radius:50%;margin-top:5px}
    .week-dish-col{flex:1;display:flex;align-items:center;gap:8px}
    .week-dish-filled{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:9px 12px;flex:1;display:flex;align-items:center;justify-content:space-between;gap:6px}
    .week-dish-filled.today-dish{border-color:#e8c547;background:#fffdf0}
    .week-dish-name{font-size:13px;font-weight:500;flex:1;line-height:1.3}
    .week-dish-actions{display:flex;gap:4px;flex-shrink:0}
    .week-empty-slot{flex:1;border:1.5px dashed #ddd;border-radius:10px;padding:9px 12px;display:flex;align-items:center;cursor:pointer;transition:all .15s;color:#ccc;font-size:13px;gap:6px}
    .week-empty-slot:hover{border-color:#aaa;color:#888;background:#faf7f2}
    .wday-add-btn{width:32px;height:32px;background:none;border:1.5px dashed #ddd;border-radius:8px;cursor:pointer;font-size:16px;color:#ccc;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .wday-add-btn:hover{border-color:#888;color:#555}
    .week-actions-row{display:flex;gap:8px;padding:16px 20px 0}
    .week-clear-btn{background:none;border:1.5px solid #f0ede8;border-radius:10px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
    .week-clear-btn:hover{border-color:#e04;color:#e04;background:#fff5f5}
    .week-manual-btn{background:#1a1a1a;border:none;border-radius:10px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:white;cursor:pointer;display:flex;align-items:center;gap:6px}
    .week-manual-btn:hover{background:#333}

    /* DAY PICKER MODAL */
    .day-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px}
    .day-opt{padding:10px 4px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;text-align:center;transition:all .15s;line-height:1.2}
    .day-opt:hover{border-color:#1a1a1a;background:#faf7f2}
    .day-opt.has-dish{background:#faf7f2;border-color:#ddd;color:#aaa}
    .day-opt.today-opt{border-color:#e8c547}
    .day-opt-date{font-size:10px;color:#aaa;font-weight:400;margin-top:2px}

    /* SEARCH */
    .search-wrap{padding:14px 20px 0;position:relative}
    .search-icon{position:absolute;left:34px;top:26px;font-size:14px;color:#aaa;pointer-events:none}
    .search-input{width:100%;border:1.5px solid #ede9e0;border-radius:12px;padding:11px 38px 11px 36px;font-family:'DM Sans',sans-serif;font-size:14px;background:white;outline:none;transition:border-color .2s}
    .search-input:focus{border-color:#1a1a1a}
    .search-clear{position:absolute;right:32px;top:26px;background:#ddd;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;color:#555;display:flex;align-items:center;justify-content:center}
    .search-results{padding:8px 20px 0}
    .search-meta{font-size:11px;color:#aaa;margin-bottom:9px;padding-top:3px}
    .search-item{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;cursor:pointer;transition:border-color .15s}
    .search-item:hover{border-color:#ccc}
    .search-item-left{flex:1;min-width:0}
    .search-dish{font-size:13.5px;font-weight:500}
    .search-cat-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#888;margin-top:2px}
    .search-actions{display:flex;gap:5px;flex-shrink:0}
    .icon-btn{background:#f5f1ea;border:none;border-radius:8px;width:30px;height:30px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
    .icon-btn:hover{background:#ede9e0}
    .icon-btn.danger:hover{background:#ffe5e5}

    /* CATEGORY */
    .cat-header{padding:20px 20px 0}
    .back-btn{background:none;border:none;font-family:'DM Sans',sans-serif;font-size:13px;color:#888;cursor:pointer;padding:0;margin-bottom:10px;display:flex;align-items:center;gap:4px}
    .cat-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;display:flex;align-items:center;gap:10px}
    .dish-list{padding:14px 20px;display:flex;flex-direction:column;gap:7px}
    .dish-item{background:white;border:1.5px solid #ede9e0;border-radius:10px;padding:10px 13px;display:flex;align-items:center;justify-content:space-between;font-size:13.5px;gap:8px;cursor:pointer;transition:border-color .15s}
    .dish-item:hover{border-color:#bbb}
    .dish-item>span{flex:1}
    .dish-actions{display:flex;gap:3px;flex-shrink:0}
    .move-btn{background:none;border:none;font-size:14px;cursor:pointer;color:#bbb;padding:0;transition:color .15s;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px}
    .move-btn:hover{color:#555;background:#f0ece4}
    .remove-btn{background:none;border:none;color:#ccc;font-size:17px;cursor:pointer;padding:0;line-height:1;transition:color .15s;width:26px;height:26px;display:flex;align-items:center;justify-content:center}
    .remove-btn:hover{color:#e05}

    /* FORMS */
    .add-form{padding:0 20px;display:flex;gap:8px;margin-top:4px}
    .add-input{flex:1;border:1.5px solid #ede9e0;border-radius:10px;padding:11px 13px;font-family:'DM Sans',sans-serif;font-size:13.5px;background:white;outline:none;transition:border-color .2s}
    .add-input:focus{border-color:#1a1a1a}
    .add-submit{background:#1a1a1a;color:white;border:none;border-radius:10px;padding:11px 16px;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .2s}
    .add-submit:hover{background:#333}
    .add-trigger{background:none;border:1.5px dashed #ccc;border-radius:10px;padding:11px 13px;width:calc(100% - 40px);margin:7px 20px 0;display:flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:13.5px;color:#aaa;cursor:pointer;transition:all .2s}
    .add-trigger:hover{border-color:#888;color:#555}

    /* MODALS */
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;z-index:200}
    .modal{background:white;border-radius:20px 20px 0 0;padding:26px 20px 38px;width:100%;max-height:88vh;overflow-y:auto}
    .modal-title{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;margin-bottom:4px}
    .modal-sub{font-size:12.5px;color:#888;margin-bottom:16px}
    .modal-form{display:flex;gap:8px}
    .move-list{display:flex;flex-direction:column;gap:7px;max-height:320px;overflow-y:auto}
    .move-option{display:flex;align-items:center;gap:10px;padding:12px 13px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13.5px;transition:all .15s;text-align:left;width:100%}
    .move-option:hover{border-color:#1a1a1a;background:#faf7f2}
    .move-option.current{opacity:.38;cursor:default;pointer-events:none;background:#f5f5f5}

    /* CAT SELECT */
    .cat-select-list{display:flex;flex-direction:column;gap:7px;max-height:300px;overflow-y:auto}
    .cat-select-opt{display:flex;align-items:center;gap:10px;padding:12px 13px;border:1.5px solid #ede9e0;border-radius:10px;background:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13.5px;transition:all .15s;text-align:left;width:100%}
    .cat-select-opt:hover{border-color:#1a1a1a;background:#faf7f2}
    .cat-select-opt.already{opacity:.38;cursor:default;pointer-events:none}

    /* CONFIRM */
    .confirm-btns{display:flex;gap:10px;margin-top:16px}
    .btn-danger{background:#e04040;color:white;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1}
    .btn-cancel{background:#f5f1ea;color:#555;border:none;border-radius:10px;padding:12px 20px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;flex:1}

    .empty{text-align:center;color:#bbb;padding:36px 20px;font-size:13.5px}
    .no-results{text-align:center;color:#bbb;padding:44px 20px 20px;font-size:13.5px}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="header-top">
            <div className="logo">Avond<span>Eten</span></div>
            <div className="save-status">{saveStatus}</div>
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
        {view==="home" && (
          <>
            <div className="home-section">
              <div className="day-label">{DAYS_NL_SUN[today.getDay()]} · {today.toLocaleDateString("nl-NL",{day:"numeric",month:"long"})}</div>
              <div className="date-title">Wat eten we vanavond?</div>
              {currentWeek[todayDayName] ? (
                <div className="suggestion-card" style={{cursor:"default"}}>
                  <div className="suggestion-label">📅 Gepland voor vandaag</div>
                  <div className="suggestion-name">{currentWeek[todayDayName]}</div>
                  <div className="suggestion-cat"><span>✓</span><span>Staat in het weekmenu</span></div>
                </div>
              ) : suggestion ? (
                <div className="suggestion-card" onClick={()=>setDayPicker({dish:suggestion,source:"catalog"})}>
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
          </>
        )}

        {/* ── WEEK ── */}
        {view==="week" && (
          <>
            <div className="week-header">
              <div className="week-title-row">
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700}}>Week {getWeekKey(today).split("-W")[1]}</div>
              </div>
              <div className="week-subtitle">{monday.toLocaleDateString("nl-NL",{day:"numeric",month:"long"})} – {new Date(monday.getTime()+6*86400000).toLocaleDateString("nl-NL",{day:"numeric",month:"long"})}</div>
            </div>
            <div className="week-list">
              {WEEK_DAYS.map((day, idx) => {
                const isToday = idx === todayWeekIdx;
                const hasDish = !!currentWeek[day];
                return (
                  <div key={day} className={`week-day-row ${isToday?"today-row":""}`}>
                    <div className="wday-col">
                      <div className="wday-label">{WEEK_DAYS_SHORT[idx]}</div>
                      <div className="wday-date">{dayDate(idx)}</div>
                      {isToday && <div className="wday-today-dot"/>}
                    </div>
                    <div className="week-dish-col">
                      {hasDish ? (
                        <div className={`week-dish-filled ${isToday?"today-dish":""}`}>
                          <div className="week-dish-name">{currentWeek[day]}</div>
                          <div className="week-dish-actions">
                            <button className="icon-btn" title="Opslaan in categorie" onClick={()=>setSaveToCatTarget(currentWeek[day])}>💾</button>
                            <button className="icon-btn danger" title="Verwijder" onClick={()=>removeFromDay(day)}>×</button>
                          </div>
                        </div>
                      ) : (
                        <div className="week-empty-slot" onClick={()=>setShowManualAdd(day)}>
                          <span>＋</span><span>Gerecht toevoegen</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="week-actions-row">
              <button className="week-clear-btn" onClick={()=>setShowClearConfirm(true)}>
                🗑 Hele week legen
              </button>
            </div>
          </>
        )}

        {/* ── BLADEREN ── */}
        {view==="browse" && (
          <>
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
          </>
        )}

        {/* ── CATEGORIE DETAIL ── */}
        {view==="category" && activeCategory && (
          <>
            <div className="cat-header">
              <button className="back-btn" onClick={()=>setView("browse")}>← Terug</button>
              <div className="cat-title"><span>{CAT_ICONS[activeCategory]||"🍽"}</span><span>{activeCategory}</span></div>
            </div>
            <div className="dish-list">
              {dishes[activeCategory]?.length===0 && <div className="empty">Nog geen gerechten</div>}
              {dishes[activeCategory]?.map((dish,i)=>(
                <div key={i} className="dish-item" onClick={()=>setDayPicker({dish,source:"catalog"})}>
                  <span>{dish}</span>
                  <div className="dish-actions" onClick={e=>e.stopPropagation()}>
                    <button className="move-btn" title="Verplaats" onClick={()=>setMoveTarget({dish,fromCat:activeCategory})}>↗</button>
                    <button className="remove-btn" onClick={()=>removeDish(activeCategory,dish)}>×</button>
                  </div>
                </div>
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
          </>
        )}

        {/* ── ZOEKEN ── */}
        {view==="search" && (
          <>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input ref={searchRef} className="search-input" placeholder="Zoek een gerecht..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
              {searchQuery && <button className="search-clear" onClick={()=>setSearchQuery("")}>×</button>}
            </div>
            <div className="search-results">
              {!searchQuery.trim() && <div className="no-results">Typ om te zoeken in alle gerechten</div>}
              {searchQuery.trim() && !searchResults.length && <div className="no-results">Geen gerechten gevonden voor "<strong>{searchQuery}</strong>"</div>}
              {searchResults.length>0 && (
                <>
                  <div className="search-meta">{searchResults.length} gerecht{searchResults.length!==1?"en":""} gevonden</div>
                  {searchResults.map(({dish,cat},i)=>(
                    <div key={i} className="search-item" onClick={()=>setDayPicker({dish,source:"catalog"})}>
                      <div className="search-item-left">
                        <div className="search-dish"><Highlight text={dish} query={searchQuery}/></div>
                        <div className="search-cat-badge"><span>{CAT_ICONS[cat]||"🍽"}</span><span>{cat}</span></div>
                      </div>
                      <div className="search-actions" onClick={e=>e.stopPropagation()}>
                        <button className="icon-btn" title="Verplaats" onClick={()=>setMoveTarget({dish,fromCat:cat})}>↗️</button>
                        <button className="icon-btn danger" title="Verwijder" onClick={()=>removeDish(cat,dish)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* ── DAY PICKER MODAL ── */}
        {dayPicker && (
          <div className="modal-overlay" onClick={()=>setDayPicker(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Inplannen</div>
              <div className="modal-sub">"{dayPicker.dish}"</div>
              <div className="day-grid">
                {WEEK_DAYS.map((day,idx)=>{
                  const isToday = idx===todayWeekIdx;
                  const hasDish = !!currentWeek[day];
                  return (
                    <button key={day} className={`day-opt ${hasDish?"has-dish":""} ${isToday?"today-opt":""}`}
                      onClick={()=>assignDishToDay(dayPicker.dish, day)}>
                      {WEEK_DAYS_SHORT[idx]}
                      <div className="day-opt-date">{dayDate(idx)}</div>
                      {hasDish && <div style={{fontSize:9,color:"#e8c547",marginTop:1}}>bezet</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MANUAL ADD TO WEEK MODAL ── */}
        {showManualAdd && (
          <div className="modal-overlay" onClick={()=>setShowManualAdd(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Gerecht toevoegen</div>
              <div className="modal-sub">{showManualAdd}</div>
              {/* Quick pick from catalog */}
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,color:"#aaa",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Uit catalogus</div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:14}}>
                {Object.entries(dishes).map(([cat,items])=>
                  items.slice(0,999).map(dish=>(
                    <button key={cat+dish} onClick={()=>{setShowManualAdd(false);assignDishToDay(dish,showManualAdd);}}
                      style={{background:"white",border:"1.5px solid #ede9e0",borderRadius:8,padding:"7px 11px",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif",fontSize:12.5,cursor:"pointer",flexShrink:0}}>
                      {dish}
                    </button>
                  ))
                )}
              </div>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,color:"#aaa",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Of typ zelf</div>
              <div className="modal-form">
                <input className="add-input" placeholder="Naam gerecht..." value={manualDish} onChange={e=>setManualDish(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&manualDish.trim()){assignDishToDay(manualDish.trim(),showManualAdd);}}} autoFocus/>
                <button className="add-submit" onClick={()=>{if(manualDish.trim())assignDishToDay(manualDish.trim(),showManualAdd);}}>Toevoegen</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SAVE TO CATEGORY MODAL ── */}
        {saveToCatTarget && (
          <div className="modal-overlay" onClick={()=>setSaveToCatTarget(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Opslaan in categorie</div>
              <div className="modal-sub">"{saveToCatTarget}"</div>
              <div className="cat-select-list">
                {Object.entries(dishes).map(([cat,items])=>{
                  const already = items.includes(saveToCatTarget);
                  return (
                    <button key={cat} className={`cat-select-opt ${already?"already":""}`} onClick={()=>saveDishToCategory(saveToCatTarget,cat)}>
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
              <div className="modal-sub">"{moveTarget.dish}"</div>
              <div className="move-list">
                {Object.keys(dishes).map(cat=>(
                  <button key={cat} className={`move-option ${cat===moveTarget.fromCat?"current":""}`} onClick={()=>moveDish(moveTarget.dish,moveTarget.fromCat,cat)}>
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
        {showClearConfirm && (
          <div className="modal-overlay" onClick={()=>setShowClearConfirm(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Hele week legen?</div>
              <div className="modal-sub">Alle geplande gerechten voor deze week worden verwijderd. Dit kan niet ongedaan worden gemaakt.</div>
              <div className="confirm-btns">
                <button className="btn-cancel" onClick={()=>setShowClearConfirm(false)}>Annuleren</button>
                <button className="btn-danger" onClick={clearWeek}>Ja, legen</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
