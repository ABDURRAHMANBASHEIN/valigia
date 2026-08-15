import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ShoppingBag, Heart, Search, Menu, X, Star, ChevronLeft, ChevronRight,
  LayoutGrid, Package, Users, TrendingUp, Settings, Bell, Plus, Minus,
  Trash2, SlidersHorizontal, ArrowUpRight, ArrowDownRight, ChevronDown,
  ShirtIcon, Headphones, Sofa, Sparkles, Dumbbell, Store, Truck, ShieldCheck,
  RotateCcw, CircleCheck, Clock, TriangleAlert, MoreHorizontal, Pencil,
  User, LogOut, MapPin, Landmark, Upload
} from "lucide-react";

/* ---------- توافقية التخزين ----------
   window.storage متوفرة بس جوا معاينة Claude. لما الموقع يُنشر كموقع
   حقيقي (Vercel وغيره)، هذا الجزء يوفّر بديل يعتمد على localStorage
   بنفس الواجهة بالضبط — يعني باقي الكود ما يحتاج أي تعديل. */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const v = window.localStorage.getItem(key);
      if (v === null) throw new Error("key not found: " + key);
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = Object.keys(window.localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

/* ---------- ضغط صورة السكرين شوت قبل تخزينها ---------- */
function resizeImageToBase64(file, maxWidth = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================================
   فاليدجا — نموذج تفاعلي: واجهة متجر + لوحة تحكم إدارية
   الهوية: حبر داكن + ورقي دافئ + كوبالت (فعل/رابط) + رمل (تخفيض/تمييز)
   التوقيع البصري: "بطاقة السعر" المائلة تتكرر كعلامة تجارية عبر الموقع
   ========================================================================= */

const TOKENS = `
  :root{
    --ink:#14151A; --ink-soft:#3A3B42; --muted:#71727C;
    --paper:#F5F2EA; --surface:#FFFFFF; --line:#E6E1D3;
    --cobalt:#622C85; --cobalt-dark:#481F63; --cobalt-tint:#EFE7F5;
    --sand:#E64A67; --sand-tint:#FCE9ED;
    --danger:#D14343; --danger-tint:#FBE6E6;
    --success:#227A4F; --success-tint:#E3F3EA;
    --radius-sm:10px; --radius-md:16px; --radius-lg:26px;
  }
  .bz-root{
    font-family:'Tajawal',system-ui,sans-serif; background:var(--paper); color:var(--ink);
    min-height:100vh; direction:rtl;
  }
  .bz-mono{ font-family:'JetBrains Mono','Tajawal',monospace; font-feature-settings:"tnum"; }
  .bz-display{ font-family:'Tajawal',sans-serif; font-weight:900; letter-spacing:-0.02em; }
  .bz-tag{
    position:relative; display:inline-flex; align-items:center; gap:6px;
    transform:rotate(-3deg); transform-origin:center;
  }
  .bz-tag::before{
    content:''; width:7px; height:7px; border-radius:50%; background:var(--paper);
    border:1.5px solid currentColor; flex:none;
  }
  .bz-card{ background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-md); }
  .bz-btn{
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    border-radius:999px; font-weight:700; transition:transform .15s ease, background .15s ease, box-shadow .15s ease;
    cursor:pointer; border:none; white-space:nowrap;
  }
  .bz-btn:active{ transform:scale(0.97); }
  .bz-btn-primary{ background:var(--ink); color:var(--paper); padding:12px 22px; }
  .bz-btn-primary:hover{ background:var(--cobalt-dark); }
  .bz-btn-cobalt{ background:var(--cobalt); color:#fff; padding:12px 22px; }
  .bz-btn-cobalt:hover{ box-shadow:0 6px 18px rgba(42,70,255,.35); }
  .bz-btn-ghost{ background:transparent; color:var(--ink); border:1.5px solid var(--line); padding:11px 20px; }
  .bz-btn-ghost:hover{ border-color:var(--ink); }
  .bz-btn:disabled{ opacity:.5; cursor:not-allowed; }
  .bz-scrollbar-none::-webkit-scrollbar{ display:none; }
  .bz-fade-in{ animation:bzFadeIn .5s ease both; }
  @keyframes bzFadeIn{ from{ opacity:0; transform:translateY(10px);} to{ opacity:1; transform:translateY(0);} }
  .bz-pulse-dot{ animation:bzPulse 1.8s ease-in-out infinite; }
  @keyframes bzPulse{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }
  @media (prefers-reduced-motion: reduce){
    .bz-fade-in, .bz-pulse-dot{ animation:none !important; }
  }
  .bz-focus:focus-visible{ outline:2.5px solid var(--cobalt); outline-offset:2px; }
  .bz-underline-grow{ position:relative; }
  .bz-underline-grow::after{
    content:''; position:absolute; right:0; bottom:-3px; height:2px; width:0; background:var(--cobalt);
    transition:width .2s ease;
  }
  .bz-underline-grow:hover::after{ width:100%; }
  .bz-price-tag-icon{ display:inline-block; transform:rotate(-8deg); }
  .bz-input{ border:1px solid var(--line); border-radius:10px; padding:11px 14px; font-size:13.5px; font-family:inherit; width:100%; background:var(--surface); }

  /* ---------- استجابة الجوال ---------- */
  .bz-desktop-row{ display:flex; }
  @media (max-width:860px){ .bz-desktop-row{ display:none; } }
  .bz-mobile-toggle{ display:none; }
  @media (max-width:860px){ .bz-mobile-toggle{ display:inline-flex; } }

  .bz-hero-grid{ display:grid; grid-template-columns:1.1fr 0.9fr; gap:40px; align-items:center; }
  @media (max-width:860px){ .bz-hero-grid{ grid-template-columns:1fr; gap:26px; } }

  .bz-trust-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  @media (max-width:700px){ .bz-trust-grid{ grid-template-columns:1fr; } }

  .bz-footer-grid{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:30px; }
  @media (max-width:860px){ .bz-footer-grid{ grid-template-columns:1fr 1fr; gap:22px; } }
  @media (max-width:480px){ .bz-footer-grid{ grid-template-columns:1fr; } }

  .bz-quickview-body{ display:flex; gap:22px; }
  @media (max-width:600px){ .bz-quickview-body{ flex-direction:column; gap:16px; } }
  .bz-quickview-img{ width:180px; height:180px; flex:none; }
  @media (max-width:600px){ .bz-quickview-img{ width:100%; height:190px; } }

  .bz-modal-overlay{ position:fixed; inset:0; background:rgba(20,21,26,.5); z-index:60; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto; }
  @media (max-width:480px){ .bz-modal-overlay{ padding:10px; } }
  .bz-modal-shell{ max-width:520px; width:100%; max-height:88vh; overflow-y:auto; }

  .bz-dash-shell{ display:flex; }
  .bz-dash-sidebar{ display:flex; flex-direction:column; }
  @media (max-width:860px){ .bz-dash-sidebar{ display:none; } }
  .bz-dash-mobile-topbar{ display:none; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--paper); z-index:20; }
  @media (max-width:860px){ .bz-dash-mobile-topbar{ display:flex; } }
  .bz-dash-main{ padding:22px 28px; }
  @media (max-width:640px){ .bz-dash-main{ padding:16px 14px; } }

  .bz-checkout-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media (max-width:480px){ .bz-checkout-grid{ grid-template-columns:1fr; } }
`;

/* ---------- بيانات تجريبية ---------- */

const CATEGORY_ICONS = {
  fashion: ShirtIcon, electronics: Headphones, home: Sofa, beauty: Sparkles, sport: Dumbbell,
};

const CATEGORIES = [
  { id: "all", name: "الكل" },
  { id: "fashion", name: "أزياء" },
  { id: "electronics", name: "إلكترونيات" },
  { id: "home", name: "منزل ومطبخ" },
  { id: "beauty", name: "جمال وعناية" },
  { id: "sport", name: "رياضة" },
];

const PALETTE_SWATCHES = [
  ["#622C85", "#EFE7F5"], ["#E64A67", "#FCE9ED"], ["#E9797B", "#FDEFEA"],
  ["#4A2066", "#EFE7F5"], ["#14151A", "#F5F2EA"], ["#9B5BB0", "#F5ECF8"],
];

function makeProducts() {
  const names = [
    ["قميص كتان واسع", "fashion"], ["حقيبة ظهر يومية", "fashion"], ["سماعات لاسلكية Pro", "electronics"],
    ["ساعة ذكية رياضية", "electronics"], ["طقم أكواب سيراميك", "home"], ["مصباح طاولة خشبي", "home"],
    ["سيروم فيتامين C", "beauty"], ["فرشاة مكياج ٥ قطع", "beauty"], ["حصيرة يوغا مزدوجة", "sport"],
    ["زجاجة مياه معزولة", "sport"], ["جاكيت شتوي مبطن", "fashion"], ["حذاء مشي خفيف", "sport"],
    ["مكبر صوت بلوتوث", "electronics"], ["بطانية صوفية دافئة", "home"], ["كريم ترطيب ليلي", "beauty"],
    ["فستان صيفي منقوش", "fashion"], ["شاحن سريع ٦٥ واط", "electronics"], ["طقم مقالي تفلون", "home"],
  ];
  return names.map((n, i) => {
    const onSale = i % 3 === 0;
    const price = 45 + ((i * 37) % 260);
    const swatch = PALETTE_SWATCHES[i % PALETTE_SWATCHES.length];
    return {
      id: i + 1,
      name: n[0],
      category: n[1],
      price: onSale ? Math.round(price * 0.72) : price,
      oldPrice: onSale ? price : null,
      rating: (3.6 + ((i * 13) % 14) / 10).toFixed(1),
      reviews: 12 + ((i * 29) % 340),
      stock: (i * 7) % 11,
      isNew: i % 5 === 0,
      swatch,
    };
  });
}
const DEFAULT_PRODUCTS = makeProducts();

function ProductGlyph({ category, size = 26, color = "currentColor" }) {
  const Icon = CATEGORY_ICONS[category] || Store;
  return <Icon size={size} color={color} strokeWidth={1.6} />;
}

/* ---------- بطاقة السعر: العنصر التوقيعي ---------- */
function PriceTagBadge({ children, tone = "ink" }) {
  const map = {
    ink: { bg: "var(--ink)", fg: "var(--paper)" },
    danger: { bg: "var(--danger)", fg: "#fff" },
    sand: { bg: "var(--sand)", fg: "#fff" },
    cobalt: { bg: "var(--cobalt)", fg: "#fff" },
  };
  const c = map[tone];
  return (
    <span
      className="bz-tag"
      style={{
        background: c.bg, color: c.fg, fontSize: 12, fontWeight: 800,
        padding: "5px 11px 5px 9px", borderRadius: 7,
      }}
    >
      {children}
    </span>
  );
}

/* ---------- بطاقة منتج ---------- */
function ProductCard({ p, onAdd, onToggleWish, wished, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="bz-fade-in"
      style={{ display: "flex", flexDirection: "column" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        onClick={() => onOpen(p)}
        style={{
          position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden",
          background: `linear-gradient(155deg, ${p.swatch[1]} 0%, ${p.swatch[1]} 55%, ${p.swatch[0]}22 100%)`,
          aspectRatio: "4/5", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", border: "1px solid var(--line)",
        }}
      >
        <div style={{ position: "absolute", top: 12, insetInlineStart: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {p.isNew && <PriceTagBadge tone="cobalt">جديد</PriceTagBadge>}
          {p.oldPrice && <PriceTagBadge tone="danger">خصم {Math.round((1 - p.price / p.oldPrice) * 100)}٪</PriceTagBadge>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWish(p.id); }}
          aria-label="أضف للمفضلة"
          className="bz-btn bz-focus"
          style={{
            position: "absolute", top: 10, insetInlineEnd: 10, width: 36, height: 36,
            background: "var(--surface)", boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
        >
          <Heart size={17} color={wished ? "var(--danger)" : "var(--ink)"} fill={wished ? "var(--danger)" : "none"} />
        </button>
        <ProductGlyph category={p.category} size={64} color={p.swatch[0]} />
        <div
          style={{
            position: "absolute", insetInlineStart: 10, insetInlineEnd: 10, bottom: 10,
            transform: hover ? "translateY(0)" : "translateY(60px)", opacity: hover ? 1 : 0,
            transition: "all .2s ease",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(p); }}
            className="bz-btn bz-btn-primary bz-focus"
            style={{ width: "100%", padding: "10px 14px", fontSize: 13.5 }}
          >
            <ShoppingBag size={15} /> أضف للسلة
          </button>
        </div>
      </div>
      <div style={{ padding: "12px 2px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <Star size={13} fill="var(--sand)" color="var(--sand)" />
          <span className="bz-mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.rating} ({p.reviews})</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{p.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="bz-mono" style={{ fontSize: 16, fontWeight: 800 }}>{p.price} د.ل</span>
          {p.oldPrice && <span className="bz-mono" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through" }}>{p.oldPrice} د.ل</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- الشعار ---------- */
function Logo({ size = "md" }) {
  const big = size === "lg";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: big ? 40 : 32, height: big ? 40 : 32,
          background: "linear-gradient(155deg,#E9797B,#E64A67)", borderRadius: 8,
          transform: "rotate(-8deg)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--surface)" }} />
      </div>
      <span className="bz-display" style={{ fontSize: big ? 26 : 21, color: "var(--cobalt)" }}>فاليدجا</span>
    </div>
  );
}

/* ---------- سلة التسوق المنسدلة ---------- */
function CartDrawer({ open, onClose, items, products, onQty, onRemove, onCheckout }) {
  const lines = items.map((it) => ({ ...it, product: products.find((p) => p.id === it.id) })).filter((l) => l.product);
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,21,26,.4)", zIndex: 40,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s ease",
        }}
      />
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, insetInlineStart: 0, width: "min(420px,92vw)",
          background: "var(--surface)", zIndex: 50, display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-105%)", transition: "transform .3s cubic-bezier(.2,.8,.3,1)",
          boxShadow: "6px 0 30px rgba(0,0,0,.12)",
        }}
      >
        <div style={{ padding: 20, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>سلة التسوق ({lines.length})</div>
          <button onClick={onClose} className="bz-btn bz-focus" style={{ width: 34, height: 34, background: "var(--paper)" }}><X size={17} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {lines.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "60px 10px" }}>
              <ShoppingBag size={34} style={{ marginBottom: 10, opacity: .5 }} />
              <div>سلتك فاضية لسّا. تصفّح المنتجات وضيف اللي يعجبك.</div>
            </div>
          )}
          {lines.map((l) => (
            <div key={l.id} style={{ display: "flex", gap: 12 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 12, flex: "none",
                background: `linear-gradient(155deg, ${l.product.swatch[1]}, ${l.product.swatch[0]}22)`,
                display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)",
              }}>
                <ProductGlyph category={l.product.category} size={26} color={l.product.swatch[0]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{l.product.name}</div>
                <div className="bz-mono" style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>{l.product.price} د.ل</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => onQty(l.id, -1)} className="bz-btn bz-focus" style={{ width: 26, height: 26, background: "var(--paper)" }}><Minus size={13} /></button>
                  <span className="bz-mono" style={{ fontSize: 13, minWidth: 14, textAlign: "center" }}>{l.qty}</span>
                  <button onClick={() => onQty(l.id, 1)} className="bz-btn bz-focus" style={{ width: 26, height: 26, background: "var(--paper)" }}><Plus size={13} /></button>
                  <button onClick={() => onRemove(l.id)} className="bz-btn bz-focus" style={{ marginInlineStart: "auto", width: 26, height: 26, color: "var(--danger)" }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <div style={{ padding: 18, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 15 }}>
              <span style={{ color: "var(--muted)" }}>الإجمالي</span>
              <span className="bz-mono" style={{ fontWeight: 900, fontSize: 19 }}>{total} د.ل</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>رسوم التوصيل تُحدَّد حسب عنوانك بعد إتمام الطلب.</div>
            <button onClick={onCheckout} className="bz-btn bz-btn-cobalt bz-focus" style={{ width: "100%", padding: "14px" }}>إتمام الطلب</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- توست بسيط ---------- */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 22, insetInlineStart: "50%", transform: "translateX(50%)",
      background: "var(--ink)", color: "var(--paper)", padding: "12px 20px", borderRadius: 999,
      fontSize: 14, fontWeight: 700, zIndex: 70, display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 10px 30px rgba(0,0,0,.25)", maxWidth: "90vw", textAlign: "center",
    }} className="bz-fade-in">
      <CircleCheck size={16} color="var(--sand)" style={{ flex: "none" }} /> {msg}
    </div>
  );
}

/* ---------- تسجيل الدخول / إنشاء حساب ---------- */
function AuthModal({ onClose, customers, signupCustomer, loginCustomer }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit() {
    setError("");
    if (mode === "signup") {
      if (!name.trim() || !phone.trim() || !password) { setError("عبّي الاسم ورقم الهاتف وكلمة المرور."); return; }
      if (customers.some((c) => c.phone === phone.trim())) { setError("رقم الهاتف ذا مسجّل مسبقاً — سجّل دخول بدل ما تنشئ حساب جديد."); return; }
      signupCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim(), password });
      onClose();
    } else {
      if (!phone.trim() || !password) { setError("عبّي رقم الهاتف وكلمة المرور."); return; }
      const ok = loginCustomer(phone.trim(), password);
      if (!ok) { setError("رقم الهاتف أو كلمة المرور غير صحيحة."); return; }
      onClose();
    }
  }

  return (
    <div onClick={onClose} className="bz-modal-overlay">
      <div onClick={(e) => e.stopPropagation()} className="bz-card bz-fade-in bz-modal-shell" style={{ padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 19 }}>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</div>
          <button onClick={onClose} className="bz-btn bz-focus" style={{ width: 32, height: 32, background: "var(--paper)" }}><X size={15} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, marginTop: 14 }}>
          <button onClick={() => { setMode("login"); setError(""); }} className="bz-focus" style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid var(--line)", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === "login" ? "var(--ink)" : "var(--surface)", color: mode === "login" ? "var(--paper)" : "var(--ink)" }}>تسجيل دخول</button>
          <button onClick={() => { setMode("signup"); setError(""); }} className="bz-focus" style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid var(--line)", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === "signup" ? "var(--ink)" : "var(--surface)", color: mode === "signup" ? "var(--paper)" : "var(--ink)" }}>حساب جديد</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "signup" && (
            <input placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} className="bz-input bz-focus" />
          )}
          <input placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} className="bz-input bz-mono bz-focus" />
          {mode === "signup" && (
            <input placeholder="البريد الإلكتروني (اختياري)" value={email} onChange={(e) => setEmail(e.target.value)} className="bz-input bz-focus" />
          )}
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="bz-input bz-focus" />
        </div>

        {error && <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 10 }}>{error}</div>}

        <button onClick={submit} className="bz-btn bz-btn-cobalt bz-focus" style={{ width: "100%", marginTop: 16 }}>
          {mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
        </button>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, lineHeight: 1.7 }}>
          هذا تسجيل دخول تجريبي محلي لأغراض العرض، وما يعتمد على تشفير حقيقي — ما ننصح تستخدم كلمة مرور حساسة فيه.
        </div>
      </div>
    </div>
  );
}

/* ---------- إتمام الطلب: عنوان ← دفع ← تأكيد ---------- */
function CheckoutModal({ onClose, cartLines, total, session, accountNumber, onPlaceOrder }) {
  const [step, setStep] = useState("address");
  const [fullName, setFullName] = useState(session?.name || "");
  const [phone, setPhone] = useState(session?.phone || "");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [placedId, setPlacedId] = useState(null);

  const addressValid = fullName.trim() && phone.trim() && city.trim() && address.trim();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await resizeImageToBase64(file);
      setScreenshot(base64);
    } catch (err) {
      setError("تعذّر قراءة الصورة، جرّب صورة ثانية.");
    } finally {
      setUploading(false);
    }
  }

  function confirmOrder() {
    if (paymentMethod === "transfer" && !screenshot) {
      setError("أرفق سكرين شوت التحويل قبل تأكيد الطلب.");
      return;
    }
    const id = "BZ-" + Math.floor(1000 + Math.random() * 9000);
    onPlaceOrder({
      id,
      customer: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      notes: notes.trim(),
      date: new Date().toLocaleDateString("ar", { day: "numeric", month: "long" }),
      items: cartLines.reduce((s, l) => s + l.qty, 0),
      cartItems: cartLines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
      amount: total,
      deliveryFee: null,
      paymentMethod,
      screenshot: paymentMethod === "transfer" ? screenshot : null,
      status: "pending_review",
    });
    setPlacedId(id);
    setStep("success");
  }

  return (
    <div onClick={step !== "success" ? onClose : undefined} className="bz-modal-overlay">
      <div onClick={(e) => e.stopPropagation()} className="bz-card bz-fade-in bz-modal-shell" style={{ padding: 26 }}>
        {step !== "success" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 19 }}>إتمام الطلب</div>
            <button onClick={onClose} className="bz-btn bz-focus" style={{ width: 32, height: 32, background: "var(--paper)" }}><X size={15} /></button>
          </div>
        )}

        {step !== "success" && (
          <div style={{ display: "flex", gap: 6, margin: "16px 0 20px" }}>
            {["العنوان", "الدفع"].map((label, i) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: 4, borderRadius: 4, marginBottom: 6,
                  background: (step === "address" && i === 0) || (step === "payment") ? "var(--cobalt)" : "var(--line)",
                }} />
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {step === "address" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="bz-checkout-grid">
              <input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bz-input bz-focus" />
              <input placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} className="bz-input bz-mono bz-focus" />
            </div>
            <input placeholder="المدينة" value={city} onChange={(e) => setCity(e.target.value)} className="bz-input bz-focus" />
            <textarea placeholder="العنوان بالتفصيل (الحي، أقرب معلم...)" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="bz-input bz-focus" style={{ resize: "vertical", fontFamily: "inherit" }} />
            <textarea placeholder="ملاحظات إضافية (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bz-input bz-focus" style={{ resize: "vertical", fontFamily: "inherit" }} />
            <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <MapPin size={14} style={{ flex: "none", marginTop: 1 }} />
              رسوم التوصيل تُحدَّد حسب عنوانك بعد مراجعة الطلب، وبنتواصل معك لتأكيدها.
            </div>
            <button
              disabled={!addressValid}
              onClick={() => { setError(""); setStep("payment"); }}
              className="bz-btn bz-btn-cobalt bz-focus"
              style={{ width: "100%", marginTop: 6 }}
            >
              التالي: طريقة الدفع
            </button>
          </div>
        )}

        {step === "payment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setPaymentMethod("cod")}
                className="bz-focus"
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, cursor: "pointer",
                  border: paymentMethod === "cod" ? "2px solid var(--cobalt)" : "1px solid var(--line)", background: "var(--surface)", textAlign: "start",
                }}
              >
                <Truck size={20} color="var(--cobalt)" style={{ flex: "none" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>الدفع عند الاستلام</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>ادفع نقداً لما يوصلك الطلب</div>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod("transfer")}
                className="bz-focus"
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, cursor: "pointer",
                  border: paymentMethod === "transfer" ? "2px solid var(--cobalt)" : "1px solid var(--line)", background: "var(--surface)", textAlign: "start",
                }}
              >
                <Landmark size={20} color="var(--cobalt)" style={{ flex: "none" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>حوالة بنكية</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>حوّل المبلغ وأرفق سكرين شوت</div>
                </div>
              </button>
            </div>

            {paymentMethod === "transfer" && (
              <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>حوّل المبلغ لهذا الحساب</div>
                <div className="bz-mono" style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>{accountNumber}</div>
                <label className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", cursor: "pointer" }}>
                  <Upload size={15} /> {uploading ? "جارِ الرفع..." : screenshot ? "تم إرفاق السكرين شوت ✓" : "أرفق سكرين شوت التحويل"}
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                </label>
                {screenshot && (
                  <img src={screenshot} alt="سكرين شوت التحويل" style={{ marginTop: 10, maxWidth: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
                )}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 15 }}>
              <span style={{ color: "var(--muted)" }}>الإجمالي (بدون توصيل)</span>
              <span className="bz-mono" style={{ fontWeight: 900 }}>{total} د.ل</span>
            </div>

            {error && <div style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("address")} className="bz-btn bz-btn-ghost bz-focus" style={{ flex: "none" }}>رجوع</button>
              <button onClick={confirmOrder} className="bz-btn bz-btn-cobalt bz-focus" style={{ flex: 1 }}>تأكيد الطلب</button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--success-tint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CircleCheck size={28} color="var(--success)" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>تم استلام طلبك 🎉</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 4 }}>رقم الطلب</div>
            <div className="bz-mono" style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>{placedId}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8, marginBottom: 20 }}>
              راح نراجع طلبك ونحدّد رسوم التوصيل حسب عنوانك، وبنتواصل معك للتأكيد قريب.
            </div>
            <button onClick={onClose} className="bz-btn bz-btn-primary bz-focus" style={{ width: "100%" }}>تمام</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= واجهة المتجر ================= */
function Storefront({ cart, setCart, wishlist, setWishlist, products, route, navigate, session, customers, signupCustomer, loginCustomer, logoutCustomer, settings, placeOrder }) {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const toastTimer = useRef(null);

  // المنتج المفتوح بالعرض السريع يُشتق من رابط الصفحة نفسه — قابل للمشاركة
  const quickView = route.productId ? products.find((p) => p.id === route.productId) || null : null;
  function openQuickView(p) { navigate(`#/product/${p.id}`); }
  function closeQuickView() { navigate("#/"); }

  const cartLines = cart.map((it) => ({ ...it, product: products.find((p) => p.id === it.id) })).filter((l) => l.product);
  const cartTotal = cartLines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  function addToCart(p) {
    setCart((prev) => {
      const found = prev.find((i) => i.id === p.id);
      if (found) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: p.id, qty: 1 }];
    });
    showToast(`تمت إضافة «${p.name}» إلى السلة`);
  }
  function qtyChange(id, delta) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }
  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }
  function toggleWish(id) {
    setWishlist((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleCheckoutClick() {
    if (!session) { setCartOpen(false); setAuthOpen(true); return; }
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  function handlePlaceOrder(order) {
    placeOrder(order);
    setCart([]);
  }

  const filtered = useMemo(() => {
    let list = category === "all" ? products : products.filter((p) => p.category === category);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, sort, products]);

  return (
    <div className="bz-root">
      <style>{TOKENS}</style>

      {/* ===== الرأس ===== */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(245,242,234,.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <button className="bz-btn bz-focus bz-mobile-toggle" style={{ width: 38, height: 38 }} onClick={() => setMobileNav(true)}><Menu size={18} /></button>
          <Logo />
          <nav className="bz-desktop-row" style={{ gap: 22, marginInlineStart: 10 }}>
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="bz-underline-grow bz-focus"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: category === c.id ? 800 : 600, color: category === c.id ? "var(--ink)" : "var(--muted)" }}
              >
                {c.name}
              </button>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <div className="bz-desktop-row" style={{ position: "relative", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", insetInlineStart: 14, color: "var(--muted)" }} />
            <input
              placeholder="ابحث عن منتج..."
              className="bz-focus"
              style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: "9px 40px 9px 16px", fontSize: 13.5, width: 210, fontFamily: "inherit" }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => (session ? setAccountMenuOpen((v) => !v) : setAuthOpen(true))}
              className="bz-btn bz-focus"
              style={{ width: 40, height: 40, background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              {session ? <span className="bz-mono" style={{ fontWeight: 800, fontSize: 13 }}>{session.name.trim()[0]}</span> : <User size={18} />}
            </button>
            {accountMenuOpen && session && (
              <div className="bz-card bz-fade-in" style={{ position: "absolute", top: 48, insetInlineEnd: 0, minWidth: 190, padding: 12, zIndex: 35 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{session.name}</div>
                <div className="bz-mono" style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>{session.phone}</div>
                <button
                  onClick={() => { logoutCustomer(); setAccountMenuOpen(false); }}
                  className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", fontSize: 12.5, padding: "8px 12px" }}
                >
                  <LogOut size={14} /> تسجيل خروج
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setCartOpen(true)} className="bz-btn bz-focus" style={{ position: "relative", width: 40, height: 40, background: "var(--surface)", border: "1px solid var(--line)" }}>
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="bz-mono" style={{ position: "absolute", top: -6, insetInlineEnd: -6, background: "var(--cobalt)", color: "#fff", fontSize: 10.5, fontWeight: 800, width: 19, height: 19, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate("#/dashboard")} className="bz-btn bz-btn-ghost bz-focus bz-desktop-row" style={{ fontSize: 13 }}>
            <LayoutGrid size={15} /> لوحة التحكم
          </button>
        </div>
      </header>

      {/* ===== قائمة الجوال ===== */}
      <div
        onClick={() => setMobileNav(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,21,26,.4)", zIndex: 44,
          opacity: mobileNav ? 1 : 0, pointerEvents: mobileNav ? "auto" : "none", transition: "opacity .25s ease",
        }}
      />
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0, width: "min(320px,88vw)",
          background: "var(--surface)", zIndex: 45, display: "flex", flexDirection: "column", padding: 20,
          transform: mobileNav ? "translateX(0)" : "translateX(105%)", transition: "transform .3s cubic-bezier(.2,.8,.3,1)",
          boxShadow: "-6px 0 30px rgba(0,0,0,.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Logo />
          <button onClick={() => setMobileNav(false)} className="bz-btn bz-focus" style={{ width: 32, height: 32, background: "var(--paper)" }}><X size={15} /></button>
        </div>
        <div style={{ position: "relative", marginBottom: 18 }}>
          <Search size={15} style={{ position: "absolute", insetInlineStart: 12, top: 11, color: "var(--muted)" }} />
          <input placeholder="ابحث عن منتج..." className="bz-input bz-focus" style={{ paddingInlineStart: 36 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
          {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); setMobileNav(false); }}
              className="bz-focus"
              style={{ textAlign: "start", background: "none", border: "none", padding: "10px 4px", cursor: "pointer", fontSize: 15, fontWeight: category === c.id ? 800 : 600, color: category === c.id ? "var(--cobalt)" : "var(--ink)" }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button onClick={() => { setMobileNav(false); navigate("#/dashboard"); }} className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", marginBottom: 10 }}>
          <LayoutGrid size={15} /> لوحة التحكم
        </button>
        {session ? (
          <button onClick={() => { logoutCustomer(); setMobileNav(false); }} className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%" }}>
            <LogOut size={15} /> تسجيل خروج ({session.name})
          </button>
        ) : (
          <button onClick={() => { setMobileNav(false); setAuthOpen(true); }} className="bz-btn bz-btn-cobalt bz-focus" style={{ width: "100%" }}>
            <User size={15} /> تسجيل الدخول
          </button>
        )}
      </div>

      {/* ===== البطل ===== */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 20px 26px" }}>
        <div className="bz-hero-grid">
        <div className="bz-fade-in">
          <PriceTagBadge tone="sand">تشكيلة الموسم — حتى ٤٠٪ خصم</PriceTagBadge>
          <h1 className="bz-display" style={{ fontSize: "clamp(32px,7vw,64px)", lineHeight: 1.08, margin: "18px 0 20px" }}>
            كل اللي تدوّر<br />عليه، بمكان وحد.
          </h1>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", maxWidth: 440, lineHeight: 1.8, marginBottom: 26 }}>
            أزياء، إلكترونيات، أدوات منزلية، ومنتجات عناية — فاليدجا يجمعلك أفضل الماركات
            بأسعار واضحة وتوصيل يوصل فعلاً بالوقت.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => document.getElementById("bz-grid")?.scrollIntoView({ behavior: "smooth" })} className="bz-btn bz-btn-primary bz-focus">
              تسوّق الآن <ChevronLeft size={16} />
            </button>
            <button className="bz-btn bz-btn-ghost bz-focus">شوف العروض</button>
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 30 }}>
            {[["+120k", "عميل راضٍ"], ["4.8", "تقييم المتجر"], ["48h", "توصيل سريع"]].map(([n, l]) => (
              <div key={l}>
                <div className="bz-mono" style={{ fontSize: 20, fontWeight: 800 }}>{n}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", height: 340 }} className="bz-fade-in">
          <div style={{
            position: "absolute", top: 0, insetInlineEnd: 0, width: "68%", height: "62%", borderRadius: 26,
            background: "linear-gradient(150deg,#EFE7F5,#622C8533)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShirtIcon size={78} strokeWidth={1.2} color="#622C85" />
          </div>
          <div style={{
            position: "absolute", bottom: 0, insetInlineStart: 0, width: "58%", height: "48%", borderRadius: 26,
            background: "linear-gradient(150deg,#FCE9ED,#E64A6733)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Headphones size={60} strokeWidth={1.2} color="#E64A67" />
          </div>
          <div style={{
            position: "absolute", bottom: "6%", insetInlineEnd: "4%", width: "34%", height: "34%", borderRadius: 20,
            background: "linear-gradient(150deg,#E3F3EA,#227A4F33)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={38} strokeWidth={1.2} color="#227A4F" />
          </div>
          <div style={{
            position: "absolute", top: "8%", insetInlineStart: "2%", background: "var(--surface)",
            border: "1px solid var(--line)", borderRadius: 14, padding: "10px 14px", boxShadow: "0 10px 24px rgba(0,0,0,.08)",
            transform: "rotate(-4deg)",
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>سعر اليوم</div>
            <div className="bz-mono" style={{ fontWeight: 800, fontSize: 15 }}>79 د.ل</div>
          </div>
        </div>
        </div>
      </section>

      {/* ===== شرائط الثقة ===== */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "10px 20px 34px" }}>
        <div className="bz-trust-grid">
        {[[Truck, "توصيل لكل المدن", "خلال ٢٤-٤٨ ساعة"], [RotateCcw, "استرجاع سهل", "خلال ١٤ يوم بدون أسئلة"], [ShieldCheck, "دفع آمن", "حماية كاملة لبياناتك"]].map(([Icon, t, s]) => (
          <div key={t} className="bz-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon size={19} color="var(--cobalt)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>{t}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{s}</div>
            </div>
          </div>
        ))}
        </div>
      </section>

      {/* ===== شبكة المنتجات ===== */}
      <section id="bz-grid" style={{ maxWidth: 1240, margin: "0 auto", padding: "10px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <h2 className="bz-display" style={{ fontSize: 23 }}>تصفّح المنتجات</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: "100%" }} className="bz-scrollbar-none">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="bz-focus"
                  style={{
                    border: "1px solid var(--line)", borderRadius: 999, padding: "7px 15px", fontSize: 13, fontWeight: 700,
                    background: category === c.id ? "var(--ink)" : "var(--surface)", color: category === c.id ? "var(--paper)" : "var(--ink)",
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <select
                value={sort} onChange={(e) => setSort(e.target.value)}
                className="bz-focus"
                style={{ appearance: "none", border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 999, padding: "8px 32px 8px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="popular">الأكثر رواجاً</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">الأعلى تقييماً</option>
              </select>
              <ChevronDown size={13} style={{ position: "absolute", insetInlineStart: 12, top: 12, pointerEvents: "none" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16 }}>
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={addToCart} onToggleWish={toggleWish} wished={wishlist.has(p.id)} onOpen={openQuickView} />
          ))}
        </div>
      </section>

      {/* ===== تذييل ===== */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "40px 20px 26px" }}>
        <div className="bz-footer-grid" style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div>
            <Logo />
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.8, maxWidth: 260 }}>
              سوقك الرقمي لكل شي تحتاجه. جودة موثوقة، وأسعار ما تندم عليها.
            </p>
          </div>
          {[["المتجر", ["أزياء", "إلكترونيات", "منزل ومطبخ", "عروض اليوم"]], ["الدعم", ["تتبّع الطلب", "الإرجاع والاستبدال", "الأسئلة الشائعة"]], ["الشركة", ["من نحن", "الوظائف", "تواصل معنا"]]].map(([h, items]) => (
            <div key={h}>
              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 14 }}>{h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((it) => <span key={it} style={{ fontSize: 13.5, color: "var(--muted)", cursor: "pointer" }}>{it}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1240, margin: "30px auto 0", paddingTop: 18, borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
          © ٢٠٢٦ فاليدجا — هذا نموذج تصميم تفاعلي بمعطيات تجريبية.
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} products={products} onQty={qtyChange} onRemove={removeFromCart} onCheckout={handleCheckoutClick} />
      <Toast msg={toast} />

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          customers={customers}
          signupCustomer={signupCustomer}
          loginCustomer={loginCustomer}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          onClose={() => setCheckoutOpen(false)}
          cartLines={cartLines}
          total={cartTotal}
          session={session}
          accountNumber={settings.transferAccount}
          onPlaceOrder={handlePlaceOrder}
        />
      )}

      {/* ===== عرض سريع ===== */}
      {quickView && (
        <div onClick={closeQuickView} className="bz-modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="bz-card bz-fade-in bz-modal-shell bz-quickview-body" style={{ padding: 24 }}>
            <div className="bz-quickview-img" style={{
              borderRadius: 18,
              background: `linear-gradient(155deg, ${quickView.swatch[1]}, ${quickView.swatch[0]}22)`,
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)",
            }}>
              <ProductGlyph category={quickView.category} size={60} color={quickView.swatch[0]} />
            </div>
            <div style={{ flex: 1 }}>
              <button onClick={closeQuickView} className="bz-btn bz-focus" style={{ float: "left", width: 30, height: 30, background: "var(--paper)" }}><X size={15} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <Star size={13} fill="var(--sand)" color="var(--sand)" />
                <span className="bz-mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>{quickView.rating} ({quickView.reviews} تقييم)</span>
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{quickView.name}</h3>
              <div className="bz-mono" style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{quickView.price} د.ل</div>
              <div style={{ fontSize: 13, color: quickView.stock > 3 ? "var(--success)" : "var(--danger)", fontWeight: 700, marginBottom: 16 }}>
                {quickView.stock > 3 ? "متوفر بالمخزون" : `بقي ${quickView.stock} قطع فقط`}
              </div>
              <button onClick={() => { addToCart(quickView); closeQuickView(); }} className="bz-btn bz-btn-cobalt bz-focus" style={{ width: "100%" }}>
                <ShoppingBag size={16} /> أضف للسلة
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast("تم نسخ رابط المنتج"); }}
                className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", marginTop: 8, fontSize: 12.5, padding: "8px 16px" }}
              >
                انسخ رابط هذا المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= لوحة التحكم ================= */

const DEFAULT_ORDERS = [
  { id: "BZ-1042", customer: "مريم الفيتوري", phone: "0912345001", city: "طرابلس", address: "حي الأندلس، بجانب مسجد الرحمة", notes: "", date: "١٤ أغسطس", amount: 340, deliveryFee: 15, status: "delivered", items: 3, paymentMethod: "cod", screenshot: null, cartItems: [] },
  { id: "BZ-1041", customer: "أحمد الشريف", phone: "0912345002", city: "بنغازي", address: "شارع جمال عبد الناصر", notes: "", date: "١٤ أغسطس", amount: 128, deliveryFee: 20, status: "shipped", items: 1, paymentMethod: "transfer", screenshot: null, cartItems: [] },
  { id: "BZ-1040", customer: "سارة العجيلي", phone: "0912345003", city: "مصراتة", address: "حي الزروق", notes: "", date: "١٣ أغسطس", amount: 512, deliveryFee: 18, status: "processing", items: 4, paymentMethod: "cod", screenshot: null, cartItems: [] },
  { id: "BZ-1039", customer: "خالد بن يوسف", phone: "0912345004", city: "طرابلس", address: "حي دمشق", notes: "", date: "١٣ أغسطس", amount: 76, deliveryFee: 15, status: "delivered", items: 1, paymentMethod: "cod", screenshot: null, cartItems: [] },
  { id: "BZ-1038", customer: "هدى المصراتي", phone: "0912345005", city: "الزاوية", address: "شارع الشط", notes: "", date: "١٢ أغسطس", amount: 245, deliveryFee: 0, status: "cancelled", items: 2, paymentMethod: "transfer", screenshot: null, cartItems: [] },
  { id: "BZ-1037", customer: "يوسف قدور", phone: "0912345006", city: "طرابلس", address: "حي النصر", notes: "", date: "١٢ أغسطس", amount: 190, deliveryFee: 15, status: "shipped", items: 2, paymentMethod: "cod", screenshot: null, cartItems: [] },
  { id: "BZ-1036", customer: "آية الزوي", phone: "0912345007", city: "بنغازي", address: "حي سيدي حسين", notes: "", date: "١١ أغسطس", amount: 410, deliveryFee: 20, status: "delivered", items: 5, paymentMethod: "transfer", screenshot: null, cartItems: [] },
];

const DEFAULT_SETTINGS = { transferAccount: "0000-0000000-00 — مصرف الجمهورية (باسم صاحب المتجر)" };

const STATUS_MAP = {
  pending_review: { label: "بانتظار المراجعة", tone: "sand", Icon: Clock },
  processing: { label: "قيد التجهيز", tone: "sand", Icon: Package },
  shipped: { label: "قيد الشحن", tone: "cobalt", Icon: Truck },
  delivered: { label: "تم التوصيل", tone: "success", Icon: CircleCheck },
  cancelled: { label: "ملغي", tone: "danger", Icon: TriangleAlert },
};

const SALES_SERIES = [32, 41, 38, 52, 49, 61, 58, 67, 72, 65, 80, 76, 88, 95];

function StatusPill({ status }) {
  const m = STATUS_MAP[status];
  const toneVars = {
    success: ["var(--success)", "var(--success-tint)"], cobalt: ["var(--cobalt)", "var(--cobalt-tint)"],
    sand: ["var(--sand)", "var(--sand-tint)"], danger: ["var(--danger)", "var(--danger-tint)"],
  }[m.tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, background: toneVars[1], color: toneVars[0],
      padding: "5px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      <m.Icon size={12.5} /> {m.label}
    </span>
  );
}

function Sparkline({ data, color = "var(--cobalt)" }) {
  const w = 120, h = 36;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ label, value, delta, positive, data, prefix = "" }) {
  return (
    <div className="bz-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{label}</div>
          <div className="bz-mono" style={{ fontSize: 25, fontWeight: 900 }}>{prefix}{value}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: positive ? "var(--success)" : "var(--danger)" }}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {delta}
          </div>
        </div>
        <Sparkline data={data} color={positive ? "#227A4F" : "#D14343"} />
      </div>
    </div>
  );
}

function BarChart({ data, labels }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, padding: "0 4px" }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: "100%", maxWidth: 26, borderRadius: 7, background: i === data.length - 1 ? "var(--cobalt)" : "var(--ink)",
              opacity: i === data.length - 1 ? 1 : 0.14 + (v / max) * 0.5,
              height: `${(v / max) * 140}px`, transition: "height .4s ease",
            }}
          />
          <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DashOverview({ products, orders }) {
  const weekLabels = ["سبت", "أحد", "اثن", "ثلا", "أرب", "خمی", "جمع"];
  const weekData = [42, 55, 48, 63, 58, 71, 88];
  const topProducts = [...products].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const totalSales = orders.reduce((s, o) => s + o.amount + (o.deliveryFee || 0), 0);
  const avgOrder = orders.length ? Math.round(totalSales / orders.length) : 0;
  const pendingCount = orders.filter((o) => o.status === "pending_review").length;
  const returnRate = orders.length ? ((orders.filter((o) => o.status === "cancelled").length / orders.length) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
        <KpiCard label="إجمالي المبيعات" value={totalSales.toLocaleString("en-US")} prefix="" data={SALES_SERIES} delta="+12.4٪ عن الأسبوع الماضي" positive />
        <KpiCard label="عدد الطلبات" value={orders.length} data={[80,70,75,90,85,95,88,100,96,110,105,120,118,130]} delta="+8.1٪ عن الأسبوع الماضي" positive />
        <KpiCard label="بانتظار المراجعة" value={pendingCount} data={[2,3,1,4,2,5,3,4,2,3,4,5,3,pendingCount||1]} delta="يحتاج تسعير توصيل" positive={pendingCount === 0} />
        <KpiCard label="معدل الإلغاء" value={`${returnRate}٪`} data={[3.2,3.0,2.9,3.1,2.7,2.6,2.5,2.6,2.4,2.3,2.2,2.3,2.1,2.1]} delta="-0.4٪ عن الأسبوع الماضي" positive={false} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>المبيعات خلال الأسبوع</div>
            <PriceTagBadge tone="cobalt">هذا الأسبوع</PriceTagBadge>
          </div>
          <BarChart data={weekData} labels={weekLabels} />
        </div>
        <div className="bz-card" style={{ padding: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>الأكثر مبيعاً</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {topProducts.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="bz-mono" style={{ fontSize: 12, color: "var(--muted)", width: 16 }}>{i + 1}</div>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flex: "none",
                  background: `linear-gradient(155deg, ${p.swatch[1]}, ${p.swatch[0]}22)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ProductGlyph category={p.category} size={16} color={p.swatch[0]} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                </div>
                <div className="bz-mono" style={{ fontSize: 12.5, fontWeight: 800 }}>{p.price} د.ل</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bz-card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>آخر الطلبات</div>
        </div>
        <OrdersTable orders={orders.slice(0, 5)} compact />
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  const m = STATUS_MAP[value];
  const toneVars = {
    success: ["var(--success)", "var(--success-tint)"], cobalt: ["var(--cobalt)", "var(--cobalt-tint)"],
    sand: ["var(--sand)", "var(--sand-tint)"], danger: ["var(--danger)", "var(--danger-tint)"],
  }[m.tone];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bz-focus"
      style={{
        appearance: "none", border: "none", background: toneVars[1], color: toneVars[0],
        padding: "6px 26px 6px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer",
      }}
    >
      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

function OrdersTable({ orders, compact, onStatusChange, onViewDetail }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {["رقم الطلب", "العميل", "التاريخ", "القطع", "المبلغ", "الحالة", ""].map((h) => (
              <th key={h} style={{ textAlign: "start", padding: "0 10px 10px", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td className="bz-mono" style={{ padding: "13px 10px", fontSize: 13, fontWeight: 700 }}>{o.id}</td>
              <td style={{ padding: "13px 10px", fontSize: 13.5 }}>{o.customer}</td>
              <td style={{ padding: "13px 10px", fontSize: 13, color: "var(--muted)" }}>{o.date}</td>
              <td className="bz-mono" style={{ padding: "13px 10px", fontSize: 13 }}>{o.items}</td>
              <td className="bz-mono" style={{ padding: "13px 10px", fontSize: 13, fontWeight: 800 }}>{o.amount} د.ل</td>
              <td style={{ padding: "13px 10px" }}>
                {onStatusChange ? <StatusSelect value={o.status} onChange={(v) => onStatusChange(o.id, v)} /> : <StatusPill status={o.status} />}
              </td>
              <td style={{ padding: "13px 10px" }}>
                {onViewDetail ? (
                  <button onClick={() => onViewDetail(o)} className="bz-btn bz-btn-ghost bz-focus" style={{ padding: "6px 14px", fontSize: 12 }}>عرض</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineNumberField({ value, onCommit, suffix, danger }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const n = Math.max(0, Number(draft));
    const clean = Number.isFinite(n) ? n : value;
    setDraft(String(clean));
    if (clean !== value) onCommit(clean);
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="bz-mono bz-focus"
        style={{
          width: 58, border: "1px solid var(--line)", borderRadius: 8, padding: "5px 7px",
          fontSize: 13, fontWeight: 800, color: danger ? "var(--danger)" : "var(--ink)", background: "var(--paper)",
        }}
      />
      {suffix && <span style={{ fontSize: 12, color: "var(--muted)" }}>{suffix}</span>}
    </span>
  );
}

/* ---------- تفاصيل الطلب + تسعير التوصيل يدوياً ---------- */
function OrderDetailModal({ order, onClose, onSave }) {
  const [fee, setFee] = useState(order.deliveryFee ?? 0);
  const total = (order.amount || 0) + (Number(fee) || 0);

  function confirm() {
    onSave(order.id, {
      deliveryFee: Number(fee) || 0,
      status: order.status === "pending_review" ? "processing" : order.status,
    });
    onClose();
  }

  return (
    <div onClick={onClose} className="bz-modal-overlay">
      <div onClick={(e) => e.stopPropagation()} className="bz-card bz-fade-in bz-modal-shell" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>تفاصيل الطلب {order.id}</div>
          <button onClick={onClose} className="bz-btn bz-focus" style={{ width: 32, height: 32, background: "var(--paper)" }}><X size={15} /></button>
        </div>

        <div className="bz-checkout-grid" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 3 }}>الزبون</div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.customer}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 3 }}>الهاتف</div>
            <div className="bz-mono" style={{ fontSize: 13.5, fontWeight: 700 }}>{order.phone || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} /> العنوان
            </div>
            <div style={{ fontSize: 13.5 }}>{order.city ? `${order.city} — ` : ""}{order.address || "—"}</div>
            {order.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>ملاحظات: {order.notes}</div>}
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 3 }}>طريقة الدفع</div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.paymentMethod === "transfer" ? "حوالة بنكية" : "الدفع عند الاستلام"}</div>
          </div>
        </div>

        {order.paymentMethod === "transfer" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>سكرين شوت التحويل</div>
            {order.screenshot ? (
              <img src={order.screenshot} alt="إثبات التحويل" style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--danger)" }}>ما فيه سكرين شوت مرفق (بيانات تجريبية قديمة)</div>
            )}
          </div>
        )}

        {order.cartItems && order.cartItems.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>محتوى الطلب</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {order.cartItems.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{it.name} × {it.qty}</span>
                  <span className="bz-mono">{it.price * it.qty} د.ل</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span style={{ color: "var(--muted)" }}>قيمة المنتجات</span>
            <span className="bz-mono" style={{ fontWeight: 700 }}>{order.amount} د.ل</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
            <span style={{ color: "var(--muted)" }}>رسوم التوصيل (حسب العنوان)</span>
            <InlineNumberField value={fee} suffix="د.ل" onCommit={setFee} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 900 }}>
            <span>الإجمالي</span>
            <span className="bz-mono">{total} د.ل</span>
          </div>
        </div>

        <button onClick={confirm} className="bz-btn bz-btn-cobalt bz-focus" style={{ width: "100%", marginTop: 16 }}>
          {order.status === "pending_review" ? "سعّر التوصيل وأكّد الطلب" : "احفظ رسوم التوصيل"}
        </button>
      </div>
    </div>
  );
}

function DashOrders({ orders, updateOrders }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const list = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  function changeStatus(id, status) {
    updateOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  }
  function saveDetail(id, patch) {
    updateOrders(orders.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  return (
    <div className="bz-card" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>كل الطلبات ({list.length})</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="bz-scrollbar-none">
          {["all", "pending_review", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s} onClick={() => setFilter(s)} className="bz-focus"
              style={{
                border: "1px solid var(--line)", borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: filter === s ? "var(--ink)" : "var(--surface)", color: filter === s ? "var(--paper)" : "var(--ink)", whiteSpace: "nowrap",
              }}
            >
              {s === "all" ? "الكل" : STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>اضغط "عرض" لأي طلب عشان تشوف العنوان والسكرين شوت وتسعّر التوصيل.</div>
      <OrdersTable orders={list} onStatusChange={changeStatus} onViewDetail={setSelected} />
      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} onSave={saveDetail} />}
    </div>
  );
}

function NewProductForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("fashion");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const canSave = name.trim().length > 0 && Number(price) > 0;
  return (
    <div style={{ border: "1.5px dashed var(--line)", borderRadius: 14, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, alignItems: "center" }}>
      <input placeholder="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} className="bz-focus" style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit" }} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="bz-focus" style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 10px", fontSize: 13.5, fontFamily: "inherit" }}>
        {CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input placeholder="السعر" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} className="bz-mono bz-focus" style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13.5 }} />
      <input placeholder="المخزون" value={stock} onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))} className="bz-mono bz-focus" style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13.5 }} />
      <button
        disabled={!canSave}
        onClick={() => onAdd({ name: name.trim(), category, price: Number(price), stock: Number(stock) || 0 })}
        className="bz-btn bz-btn-cobalt bz-focus"
        style={{ padding: "9px 16px", fontSize: 13 }}
      >
        حفظ
      </button>
      <button onClick={onCancel} className="bz-btn bz-focus" style={{ width: 36, height: 36, background: "var(--paper)" }}><X size={15} /></button>
    </div>
  );
}

function DashProducts({ products, updateProducts }) {
  const [adding, setAdding] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  function flash() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  }
  function patchProduct(id, patch) {
    updateProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    flash();
  }
  function deleteProduct(id) {
    updateProducts(products.filter((p) => p.id !== id));
    flash();
  }
  function addProduct(data) {
    const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const swatch = PALETTE_SWATCHES[nextId % PALETTE_SWATCHES.length];
    updateProducts([...products, { id: nextId, oldPrice: null, rating: "4.5", reviews: 0, isNew: true, swatch, ...data }]);
    setAdding(false);
    flash();
  }

  return (
    <div className="bz-card" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>إدارة المنتجات ({products.length})</div>
          {savedFlash && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><CircleCheck size={13} /> تم الحفظ</span>}
        </div>
        {!adding && <button onClick={() => setAdding(true)} className="bz-btn bz-btn-cobalt bz-focus" style={{ padding: "9px 18px", fontSize: 13 }}><Plus size={15} /> منتج جديد</button>}
      </div>

      {adding && <NewProductForm onAdd={addProduct} onCancel={() => setAdding(false)} />}

      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>عدّل السعر أو المخزون مباشرة بالجدول — تتحفظ التغييرات فور الخروج من الحقل.</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["المنتج", "التصنيف", "السعر", "المخزون", "الحالة", ""].map((h) => (
                <th key={h} style={{ textAlign: "start", padding: "0 10px 10px", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flex: "none",
                      background: `linear-gradient(155deg, ${p.swatch[1]}, ${p.swatch[0]}22)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ProductGlyph category={p.category} size={15} color={p.swatch[0]} />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 10px", fontSize: 13, color: "var(--muted)" }}>{CATEGORIES.find((c) => c.id === p.category)?.name}</td>
                <td style={{ padding: "12px 10px" }}>
                  <InlineNumberField value={p.price} suffix="د.ل" onCommit={(v) => patchProduct(p.id, { price: v })} />
                </td>
                <td style={{ padding: "12px 10px" }}>
                  <InlineNumberField value={p.stock} danger={p.stock === 0} onCommit={(v) => patchProduct(p.id, { stock: v })} />
                </td>
                <td style={{ padding: "12px 10px" }}>
                  {p.stock === 0 ? <PriceTagBadge tone="danger">نفد المخزون</PriceTagBadge> : p.stock <= 3 ? <PriceTagBadge tone="sand">كمية محدودة</PriceTagBadge> : <PriceTagBadge tone="ink">متوفر</PriceTagBadge>}
                </td>
                <td style={{ padding: "12px 10px" }}>
                  <button onClick={() => deleteProduct(p.id)} aria-label="احذف المنتج" className="bz-btn bz-focus" style={{ width: 30, height: 30, background: "var(--paper)", color: "var(--danger)" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashCustomers({ orders }) {
  const customers = Array.from(new Set(orders.map((o) => o.customer))).map((name, i) => ({
    name, orders: orders.filter((o) => o.customer === name).length,
    spent: orders.filter((o) => o.customer === name).reduce((s, o) => s + o.amount, 0),
    joined: ["يناير ٢٠٢٤", "مارس ٢٠٢٤", "يونيو ٢٠٢٤", "أغسطس ٢٠٢٤", "سبتمبر ٢٠٢٤"][i % 5],
  }));
  return (
    <div className="bz-card" style={{ padding: 22 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18 }}>العملاء ({customers.length})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {customers.map((c) => (
          <div key={c.name} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--cobalt-tint)", color: "var(--cobalt)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                {c.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>عضو منذ {c.joined}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--muted)" }}>{c.orders} طلبات</span>
              <span className="bz-mono" style={{ fontWeight: 800 }}>{c.spent} د.ل</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashSettings({ settings, updateSettings }) {
  const [draft, setDraft] = useState(settings.transferAccount);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(settings.transferAccount), [settings.transferAccount]);

  function save() {
    updateSettings({ ...settings, transferAccount: draft.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="bz-card" style={{ padding: 22, maxWidth: 480 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>إعدادات الدفع</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18, lineHeight: 1.7 }}>
        رقم الحساب اللي بيشوفه الزبون لما يختار الدفع بالحوالة البنكية عند إتمام الطلب.
      </div>
      <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>رقم الحساب / تفاصيل التحويل</label>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} className="bz-mono bz-focus" style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, marginBottom: 14, fontFamily: "inherit", resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={save} className="bz-btn bz-btn-cobalt bz-focus" style={{ padding: "10px 20px", fontSize: 13.5 }}>حفظ</button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--success)", fontWeight: 700 }}>تم الحفظ ✓</span>}
      </div>
    </div>
  );
}

function Dashboard({ products, updateProducts, orders, updateOrders, settings, updateSettings, route, navigate }) {
  const tab = route.tab || "overview";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const NAV = [
    { id: "overview", label: "نظرة عامة", Icon: LayoutGrid },
    { id: "orders", label: "الطلبات", Icon: Package },
    { id: "products", label: "المنتجات", Icon: Store },
    { id: "customers", label: "العملاء", Icon: Users },
    { id: "settings", label: "الإعدادات", Icon: Settings },
  ];

  function goTab(id) {
    navigate(`#/dashboard/${id}`);
    setDrawerOpen(false);
  }

  return (
    <div className="bz-root bz-dash-shell">
      <style>{TOKENS}</style>

      <aside className="bz-dash-sidebar" style={{ width: 232, flex: "none", borderInlineEnd: "1px solid var(--line)", padding: 20, minHeight: "100vh", position: "sticky", top: 0 }}>
        <Logo />
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, marginBottom: 26 }}>لوحة التحكم</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => (
            <button
              key={n.id} onClick={() => goTab(n.id)} className="bz-focus"
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 11, border: "none",
                background: tab === n.id ? "var(--ink)" : "transparent", color: tab === n.id ? "var(--paper)" : "var(--ink-soft)",
                fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "start", fontFamily: "inherit",
              }}
            >
              <n.Icon size={17} /> {n.label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate("#/")} className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", fontSize: 13 }}>
          <TrendingUp size={15} /> رجوع للمتجر
        </button>
      </aside>

      {/* ===== شريط علوي + قائمة منسدلة للجوال ===== */}
      <div className="bz-dash-mobile-topbar">
        <button onClick={() => setDrawerOpen(true)} className="bz-btn bz-focus" style={{ width: 36, height: 36, background: "var(--surface)", border: "1px solid var(--line)" }}><Menu size={17} /></button>
        <Logo size="sm" />
      </div>
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,21,26,.4)", zIndex: 54,
          opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? "auto" : "none", transition: "opacity .25s ease",
        }}
      />
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, insetInlineStart: 0, width: "min(280px,86vw)",
          background: "var(--surface)", zIndex: 55, display: "flex", flexDirection: "column", padding: 18,
          transform: drawerOpen ? "translateX(0)" : "translateX(-105%)", transition: "transform .3s cubic-bezier(.2,.8,.3,1)",
          boxShadow: "6px 0 30px rgba(0,0,0,.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Logo />
          <button onClick={() => setDrawerOpen(false)} className="bz-btn bz-focus" style={{ width: 32, height: 32, background: "var(--paper)" }}><X size={15} /></button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => (
            <button
              key={n.id} onClick={() => goTab(n.id)} className="bz-focus"
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 11, border: "none",
                background: tab === n.id ? "var(--ink)" : "transparent", color: tab === n.id ? "var(--paper)" : "var(--ink-soft)",
                fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "start", fontFamily: "inherit",
              }}
            >
              <n.Icon size={17} /> {n.label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate("#/")} className="bz-btn bz-btn-ghost bz-focus" style={{ width: "100%", fontSize: 13 }}>
          <TrendingUp size={15} /> رجوع للمتجر
        </button>
      </div>

      <main className="bz-dash-main" style={{ flex: 1, maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="bz-display" style={{ fontSize: 22 }}>{NAV.find((n) => n.id === tab)?.label}</h2>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>مرحباً بعودتك، إليك ملخص أداء متجرك</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="bz-btn bz-focus" style={{ width: 38, height: 38, background: "var(--surface)", border: "1px solid var(--line)", position: "relative" }}>
              <Bell size={16} />
              <span className="bz-pulse-dot" style={{ position: "absolute", top: 8, insetInlineEnd: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
            </button>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(155deg,#E9797B,#E64A67)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>ف</div>
          </div>
        </div>
        {tab === "overview" && <DashOverview products={products} orders={orders} />}
        {tab === "orders" && <DashOrders orders={orders} updateOrders={updateOrders} />}
        {tab === "products" && <DashProducts products={products} updateProducts={updateProducts} />}
        {tab === "customers" && <DashCustomers orders={orders} />}
        {tab === "settings" && <DashSettings settings={settings} updateSettings={updateSettings} />}
      </main>
    </div>
  );
}

/* ================= التطبيق الرئيسي ================= */

const STORE_KEY = "valigia_products_v1";
const ORDERS_KEY = "valigia_orders_v1";
const CUSTOMERS_KEY = "valigia_customers_v1";
const SESSION_KEY = "valigia_session_v1";
const SETTINGS_KEY = "valigia_settings_v1";

/* ---------- نظام توجيه بسيط قائم على الرابط (#/...) ----------
   يشتغل جوا معاينة Claude كتنقّل داخلي، ونفس الكود يصير روابط
   حقيقية قابلة للمشاركة فور ما يُنشر الموقع على نطاقه الخاص. */
function parseRoute(hash) {
  const clean = (hash || "").replace(/^#\/?/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts[0] === "dashboard") {
    return { view: "dashboard", tab: parts[1] || "overview" };
  }
  if (parts[0] === "product" && parts[1]) {
    return { view: "store", productId: Number(parts[1]) };
  }
  return { view: "store" };
}

export default function BazaarApp() {
  const [route, setRoute] = useState(() => parseRoute(typeof window !== "undefined" ? window.location.hash : ""));
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [session, setSession] = useState(undefined);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(false);

  function navigate(hash) {
    window.location.hash = hash;
  }

  useEffect(() => {
    function onHashChange() { setRoute(parseRoute(window.location.hash)); }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // تحميل البيانات المحفوظة عند فتح الموقع، أو زرعها لأول مرة
  useEffect(() => {
    let cancelled = false;
    async function loadKey(key, defaults, setter) {
      try {
        const res = await window.storage.get(key, false);
        if (!cancelled) setter(JSON.parse(res.value));
      } catch (e) {
        try { await window.storage.set(key, JSON.stringify(defaults), false); } catch (e2) { /* تجاهل */ }
        if (!cancelled) setter(defaults);
      }
    }
    Promise.all([
      loadKey(STORE_KEY, DEFAULT_PRODUCTS, setProducts),
      loadKey(ORDERS_KEY, DEFAULT_ORDERS, setOrders),
      loadKey(CUSTOMERS_KEY, [], setCustomers),
      loadKey(SESSION_KEY, null, setSession),
      loadKey(SETTINGS_KEY, DEFAULT_SETTINGS, setSettings),
    ]).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  async function persist(key, value, setter) {
    setter(value);
    try {
      await window.storage.set(key, JSON.stringify(value), false);
    } catch (e) {
      setLoadError(true);
    }
  }

  const updateProducts = (next) => persist(STORE_KEY, next, setProducts);
  const updateOrders = (next) => persist(ORDERS_KEY, next, setOrders);
  const updateCustomers = (next) => persist(CUSTOMERS_KEY, next, setCustomers);
  const updateSession = (next) => persist(SESSION_KEY, next, setSession);
  const updateSettings = (next) => persist(SETTINGS_KEY, next, setSettings);

  function placeOrder(order) {
    updateOrders([order, ...orders]);
  }
  function signupCustomer(data) {
    const newCustomer = { id: Date.now(), ...data };
    updateCustomers([...customers, newCustomer]);
    updateSession(newCustomer);
    return newCustomer;
  }
  function loginCustomer(phone, password) {
    const found = customers.find((c) => c.phone === phone && c.password === password);
    if (found) updateSession(found);
    return found || null;
  }
  function logoutCustomer() {
    updateSession(null);
  }

  const stillLoading = products === null || orders === null || customers === null || session === undefined || settings === null;

  if (stillLoading) {
    return (
      <div className="bz-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{TOKENS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, margin: "0 auto 16px",
            background: "linear-gradient(155deg,#E9797B,#E64A67)", transform: "rotate(-8deg)",
          }} />
          <div style={{ color: "var(--muted)", fontSize: 14 }}>جارِ تحميل بيانات المتجر...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {loadError && (
        <div style={{
          position: "fixed", top: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 100,
          background: "var(--danger)", color: "#fff", textAlign: "center", padding: "8px", fontSize: 13, fontFamily: "'Tajawal',sans-serif",
        }}>
          تعذّر حفظ بعض التغييرات — تحقق من الاتصال وحاول مجدداً.
        </div>
      )}
      {route.view === "dashboard" ? (
        <Dashboard
          route={route} navigate={navigate}
          products={products} updateProducts={updateProducts}
          orders={orders} updateOrders={updateOrders}
          settings={settings} updateSettings={updateSettings}
        />
      ) : (
        <Storefront
          route={route} navigate={navigate}
          cart={cart} setCart={setCart}
          wishlist={wishlist} setWishlist={setWishlist}
          products={products}
          session={session} customers={customers}
          signupCustomer={signupCustomer} loginCustomer={loginCustomer} logoutCustomer={logoutCustomer}
          settings={settings} placeOrder={placeOrder}
        />
      )}
    </>
  );
}
