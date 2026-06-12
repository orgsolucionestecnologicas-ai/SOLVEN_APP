import Link from "next/link";
import { Sora, DM_Sans } from "next/font/google";
import { LandingScroll } from "./ui/landing-scroll";
import NoaChat from "@/components/noa/NoaChat";
import "./landing.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
});

type IconName =
  | "cart" | "box" | "users" | "wallet" | "tag" | "chart"
  | "check" | "arrow-right" | "menu" | "zap" | "store"
  | "smartphone" | "shield" | "trending-up" | "alert-triangle"
  | "check-circle" | "social"
  | "shopping-bag" | "cross" | "wrench" | "shirt" | "utensils" | "settings"
  | "home" | "rotate-ccw" | "layers" | "file-text" | "user-cog"
  | "credit-card" | "dollar-sign" | "calendar" | "search" | "lock"
  | "chevron-left" | "chevron-right" | "user-plus" | "refresh-cw" | "plus";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );
    case "zap":
      return (
        <svg {...common}>
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M3 9 12 2l9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "smartphone":
      return (
        <svg {...common}>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M11 18h2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6Z" />
        </svg>
      );
    case "trending-up":
      return (
        <svg {...common}>
          <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
          <path d="M16 7h6v6" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg {...common}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4 12 14.01l-3-3" />
        </svg>
      );
    case "social":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );
    case "shopping-bag":
      return (
        <svg {...common}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
        </svg>
      );
    case "shirt":
      return (
        <svg {...common}>
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "rotate-ccw":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12.83 2.18-8.57 3.9a1 1 0 0 0 0 1.84l8.57 3.9a2 2 0 0 0 1.66 0l8.57-3.9a1 1 0 0 0 0-1.84l-8.57-3.9a2 2 0 0 0-1.66 0z" />
          <path d="m2.26 12.18 8.57 3.9a2 2 0 0 0 1.66 0l8.57-3.9" />
          <path d="m2.26 17.18 8.57 3.9a2 2 0 0 0 1.66 0l8.57-3.9" />
        </svg>
      );
    case "file-text":
      return (
        <svg {...common}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "user-cog":
      return (
        <svg {...common}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a4 4 0 0 1 4-4h3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M18 13v1M18 20v1M14.6 15l.9.5M21.5 18.5l.9.5M21.4 15l-.9.5M14.5 18.5l-.9.5" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "dollar-sign":
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg {...common}>
          <path d="M15 18 9 12l6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );
    case "user-plus":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      );
    case "refresh-cw":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
}

const sidebarItemsV2: { label: string; icon: IconName }[] = [
  { label: "Inicio", icon: "home" },
  { label: "Ventas", icon: "cart" },
  { label: "Devoluciones", icon: "rotate-ccw" },
  { label: "Productos", icon: "box" },
  { label: "Servicios", icon: "wrench" },
  { label: "Inventario", icon: "layers" },
  { label: "Clientes", icon: "users" },
  { label: "Caja", icon: "credit-card" },
  { label: "Cotizaciones", icon: "file-text" },
  { label: "Reportes", icon: "chart" },
  { label: "Promociones", icon: "tag" },
  { label: "Configuración", icon: "settings" },
  { label: "Usuarios", icon: "user-cog" },
];

const quickActionsV2: { label: string; icon: IconName }[] = [
  { label: "Nueva venta", icon: "cart" },
  { label: "Nuevo producto", icon: "box" },
  { label: "Abrir caja", icon: "credit-card" },
  { label: "Ver reportes", icon: "chart" },
  { label: "Nuevo cliente", icon: "user-plus" },
  { label: "Ajuste de stock", icon: "refresh-cw" },
];

const topProductsV2 = [
  { name: "Coca Cola 2.25L", total: "$ 89.400", units: "42 uds.", initial: "C" },
  { name: "Pan Lactal Bimbo", total: "$ 67.200", units: "38 uds.", initial: "P" },
  { name: "Yerba Rosamonte 1kg", total: "$ 54.800", units: "24 uds.", initial: "Y" },
  { name: "Cerveza Quilmes 1L", total: "$ 48.600", units: "22 uds.", initial: "C" },
  { name: "Leche La Serenísima 1L", total: "$ 41.250", units: "18 uds.", initial: "L" },
];

const cashMovementsV2: { label: string; time: string; amount: string; type: "in" | "out" }[] = [
  { label: "Venta", time: "14:32 PM", amount: "+$ 12.400", type: "in" },
  { label: "Pago de deuda", time: "13:15 PM", amount: "+$ 8.900", type: "in" },
  { label: "Gasto", time: "11:48 AM", amount: "-$ 3.200", type: "out" },
  { label: "Venta", time: "10:22 AM", amount: "+$ 5.750", type: "in" },
];

const weeklySalesData = [78000, 95000, 142000, 118000, 165000, 198000, 248500];
const weeklySalesDays = ["Sáb 6", "Dom 7", "Lun 8", "Mar 9", "Mié 10", "Jue 11", "Vie 12"];

function sparkPoints(data: number[]) {
  const w = 80;
  const h = 28;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function weeklyChartPoints(data: number[], maxVal: number) {
  const w = 430;
  const h = 140;
  const x0 = 40;
  const y0 = 10;
  return data.map((v, i) => ({
    x: Number((x0 + (i * w) / (data.length - 1)).toFixed(1)),
    y: Number((y0 + (1 - v / maxVal) * h).toFixed(1)),
  }));
}

export default function LandingPage() {
  const weeklyPoints = weeklyChartPoints(weeklySalesData, 240000);
  const weeklyPolyline = weeklyPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const weeklyArea = `M${weeklyPoints[0].x},150 L${weeklyPoints.map((p) => `${p.x},${p.y}`).join(" L")} L${weeklyPoints[weeklyPoints.length - 1].x},150 Z`;

  return (
    <div className={`landing-root ${sora.variable} ${dmSans.variable}`}>
      {/* TOP BAR */}
      <div className="top-bar">
        SOLVEN para empresas — Implementación asistida, capacitación y soporte dedicado.
        <a href="#precio">Hablar con ventas →</a>
      </div>

      {/* NAV */}
      <nav>
        <div className="nav-left">
          <Link href="/" className="nav-logo">
            <div className="nav-logo-icon">S</div>
            <span className="nav-logo-text">SOLVEN</span>
          </Link>
          <div className="nav-divider" />
          <span className="nav-tag">Empresa</span>
        </div>

        <ul className="nav-links">
          <li><a href="#features">Plataforma</a></li>
          <li><a href="#modulos">Módulos</a></li>
          <li><a href="#industrias">Industrias</a></li>
          <li><a href="#infraestructura">Seguridad</a></li>
          <li><a href="#porque">Por qué SOLVEN</a></li>
          <li><a href="#precio">Precio</a></li>
          <li><a href="#recursos">Recursos</a></li>
        </ul>

        <div className="nav-cta">
          <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn-primary">Comenzar gratis</Link>
        </div>

        <input type="checkbox" id="nav-toggle" className="nav-toggle-checkbox" />
        <label htmlFor="nav-toggle" className="nav-toggle-label" aria-label="Abrir menú de navegación">
          <Icon name="menu" size={18} />
        </label>
        <div className="nav-mobile-menu">
          <a href="#features">Plataforma</a>
          <a href="#modulos">Módulos</a>
          <a href="#industrias">Industrias</a>
          <a href="#infraestructura">Seguridad</a>
          <a href="#porque">Por qué SOLVEN</a>
          <a href="#precio">Precio</a>
          <a href="#recursos">Recursos</a>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/register">Comenzar gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="container hero-grid">
          <div>
            <h1>Software de gestión empresarial para comercios.</h1>
            <p className="hero-sub">
              SOLVEN unifica ventas, inventario, caja, clientes y reportes en una única plataforma.
              Diseñada para dueños que necesitan decisiones basadas en datos, no en intuición.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="btn-hero">
                Solicitar acceso
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#features" className="btn-hero-secondary">
                Ver la plataforma
                <Icon name="arrow-right" size={16} />
              </a>
            </div>
            <div className="hero-trust">
              <div className="hero-trust-item">
                <Icon name="check" size={14} />
                14 días sin cargo
              </div>
              <div className="hero-trust-item">
                <Icon name="check" size={14} />
                Sin tarjeta para empezar
              </div>
              <div className="hero-trust-item">
                <Icon name="check" size={14} />
                Soporte humano en español
              </div>
            </div>
          </div>

          <div className="hero-visual fade-in">
            <div className="hero-visual-header">
              <div className="hero-visual-tab active">Inicio</div>
              <div className="hero-visual-tab">Ventas</div>
              <div className="hero-visual-tab">Reportes</div>
            </div>
            <div className="hero-visual-body">
              <div className="hero-kpis">
                <div className="hero-kpi">
                  <div className="hero-kpi-label">Ventas del día</div>
                  <div className="hero-kpi-value">$2.450</div>
                  <div className="hero-kpi-delta">▲ 18,6% vs ayer</div>
                </div>
                <div className="hero-kpi">
                  <div className="hero-kpi-label">Ventas del mes</div>
                  <div className="hero-kpi-value">$38.750</div>
                  <div className="hero-kpi-delta">▲ 24,3% vs anterior</div>
                </div>
              </div>
              <div className="hero-chart">
                {[40, 55, 35, 70, 60, 90, 75, 85, 65, 95, 80, 100].map((h, i) => (
                  <div
                    key={i}
                    className={`hero-bar${i === 11 ? " accent" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTO */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <div className="eyebrow">En producción</div>
            <h2>Así se ve SOLVEN por dentro.</h2>
            <p className="section-sub">
              Una interfaz pensada para que el operador del comercio decida rápido y bien.
            </p>
          </div>

          <div className="product-mock fade-in" aria-hidden="true">
            <div className="product-mock-topbar">
              <div className="product-mock-dots">
                <span className="product-mock-dot red" />
                <span className="product-mock-dot yellow" />
                <span className="product-mock-dot green" />
              </div>
              <span className="product-mock-nav-btn"><Icon name="chevron-left" size={14} /></span>
              <span className="product-mock-nav-btn"><Icon name="chevron-right" size={14} /></span>
              <div className="product-mock-url">
                <Icon name="lock" size={11} />
                <span>solvenrs.com</span>
              </div>
              <span className="product-mock-profile"><Icon name="plus" size={14} /></span>
            </div>
            <div className="product-mock-body">
              <div className="product-sidebar-v2">
                <div className="product-sidebar-top">
                  <div className="product-sidebar-brand">
                    <div className="product-sidebar-logo">S</div>
                    <span className="product-sidebar-name">SOLVEN</span>
                  </div>
                  <div className="product-sidebar-search">
                    <Icon name="search" size={14} />
                    <span>Buscar...</span>
                  </div>
                </div>
                <div className="product-sidebar-nav">
                  {sidebarItemsV2.map((item, i) => (
                    <div key={item.label} className={`product-sidebar-item-v2${i === 0 ? " active" : ""}`}>
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="product-sidebar-bottom">
                  <div className="product-sidebar-avatar">JR</div>
                  <div>
                    <div className="product-sidebar-username">Juan Rodríguez</div>
                    <div className="product-sidebar-userrole">Propietario</div>
                  </div>
                </div>
              </div>
              <div className="product-main-v2">
                <div className="product-main-header-v2">
                  <div>
                    <div className="product-main-title-v2">Hola, Juan 👋</div>
                    <div className="product-main-sub-v2">Aquí tienes el resumen de tu negocio</div>
                  </div>
                  <div className="product-main-date">
                    <Icon name="calendar" size={15} />
                    <span>Viernes, 12 junio 2026</span>
                  </div>
                </div>

                <div className="product-main-content">
                  <div className="product-kpis-v2">
                    <div className="product-kpi-v2">
                      <div className="product-kpi-v2-head">
                        <div>
                          <div className="product-kpi-v2-label">Ventas del día</div>
                          <div className="product-kpi-v2-value">$ 248.500</div>
                          <div className="product-kpi-v2-delta">▲ $42.300 vs ayer</div>
                        </div>
                        <div className="product-kpi-v2-icon violet"><Icon name="dollar-sign" size={18} /></div>
                      </div>
                      <svg className="product-kpi-v2-spark" viewBox="0 0 80 28">
                        <polyline fill="none" points={sparkPoints([78, 95, 142, 118, 165, 198, 248])} stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    </div>
                    <div className="product-kpi-v2">
                      <div className="product-kpi-v2-head">
                        <div>
                          <div className="product-kpi-v2-label">Ventas del mes</div>
                          <div className="product-kpi-v2-value">$ 4.187.250</div>
                        </div>
                        <div className="product-kpi-v2-icon green"><Icon name="shopping-bag" size={18} /></div>
                      </div>
                      <svg className="product-kpi-v2-spark" viewBox="0 0 80 28">
                        <polyline fill="none" points={sparkPoints([120, 140, 168, 155, 182, 210, 238])} stroke="#16A34A" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    </div>
                    <div className="product-kpi-v2">
                      <div className="product-kpi-v2-head">
                        <div>
                          <div className="product-kpi-v2-label">Ganancia del día</div>
                          <div className="product-kpi-v2-value">$ 96.840</div>
                        </div>
                        <div className="product-kpi-v2-icon blue"><Icon name="trending-up" size={18} /></div>
                      </div>
                      <svg className="product-kpi-v2-spark" viewBox="0 0 80 28">
                        <polyline fill="none" points={sparkPoints([32, 38, 52, 44, 68, 82, 96])} stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    </div>
                    <div className="product-kpi-v2">
                      <div className="product-kpi-v2-head">
                        <div>
                          <div className="product-kpi-v2-label">Productos bajos</div>
                          <div className="product-kpi-v2-value">12</div>
                        </div>
                        <div className="product-kpi-v2-icon orange"><Icon name="box" size={18} /></div>
                      </div>
                      <div className="product-kpi-v2-link">Ver inventario →</div>
                    </div>
                  </div>

                  <div className="product-grid-v2">
                    <div className="product-card-v2 product-chart-card-v2">
                      <div className="product-card-v2-title">Ventas de los últimos 7 días</div>
                      <svg className="product-weekly-chart" viewBox="0 0 480 180">
                        {[10, 45, 80, 115, 150].map((y) => (
                          <line key={y} stroke="#E2E8F0" strokeWidth={1} x1="40" x2="470" y1={y} y2={y} />
                        ))}
                        {["$240K", "$180K", "$120K", "$60K", "$0"].map((label, i) => (
                          <text dominantBaseline="middle" fill="#94A3B8" fontSize="10" key={label} textAnchor="end" x="34" y={10 + i * 35}>{label}</text>
                        ))}
                        <defs>
                          <linearGradient id="violet-fill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <path d={weeklyArea} fill="url(#violet-fill)" />
                        <polyline fill="none" points={weeklyPolyline} stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        {weeklyPoints.map((p, i) => (
                          <circle cx={p.x} cy={p.y} fill="#7C3AED" key={i} r={3} />
                        ))}
                        {weeklySalesDays.map((day, i) => (
                          <text fill="#94A3B8" fontSize="10" key={day} textAnchor="middle" x={weeklyPoints[i].x} y="172">{day}</text>
                        ))}
                      </svg>
                    </div>

                    <div className="product-card-v2 product-top-products-v2">
                      <div className="product-card-v2-header">
                        <div className="product-card-v2-title">Productos más vendidos</div>
                        <span className="product-card-v2-link">Ver todos</span>
                      </div>
                      <div className="product-top-list">
                        {topProductsV2.map((p, i) => (
                          <div className="product-top-item" key={p.name}>
                            <div className="product-top-rank">{i + 1}</div>
                            <div className="product-top-avatar">{p.initial}</div>
                            <div className="product-top-info">
                              <div className="product-top-name">{p.name}</div>
                              <div className="product-top-total">{p.total}</div>
                            </div>
                            <div className="product-top-units">{p.units}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="product-panels-v2">
                    <div className="product-card-v2">
                      <div className="product-card-v2-header">
                        <div className="product-card-v2-title">Movimientos de caja</div>
                        <span className="product-card-v2-link">Ver todos</span>
                      </div>
                      <div className="product-cash-list">
                        {cashMovementsV2.map((m, i) => (
                          <div className="product-cash-item" key={i}>
                            <div className={`product-cash-icon ${m.type}`}>{m.type === "in" ? "↑" : "↓"}</div>
                            <div className="product-cash-info">
                              <div className="product-cash-label">{m.type === "in" ? "↑" : "↓"} {m.label}</div>
                              <div className="product-cash-time">{m.time}</div>
                            </div>
                            <div className={`product-cash-amount ${m.type}`}>{m.amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="product-card-v2">
                      <div className="product-card-v2-header">
                        <div className="product-card-v2-title">Alertas importantes</div>
                        <span className="product-card-v2-link">Ver todas</span>
                      </div>
                      <div className="product-alerts">
                        <div className="product-alert orange">
                          <div className="product-alert-title">⚠ Stock bajo</div>
                          <div className="product-alert-text">12 productos con stock ≤ 5</div>
                        </div>
                        <div className="product-alert yellow">
                          <div className="product-alert-title">! Pagos pendientes</div>
                          <div className="product-alert-text">5 deudas activas sin saldar</div>
                        </div>
                        <div className="product-alert violet">
                          <div className="product-alert-title">📋 Cotizaciones por vencer</div>
                          <div className="product-alert-text">2 cotizaciones vencen en las próximas 24 hs</div>
                          <div className="product-alert-link">Ver cotizaciones →</div>
                        </div>
                      </div>
                    </div>

                    <div className="product-card-v2">
                      <div className="product-card-v2-title">Resumen rápido</div>
                      <div className="product-summary-list">
                        <div className="product-summary-row"><span>Ventas de hoy</span><span>$ 248.500</span></div>
                        <div className="product-summary-row"><span>Ganancia de hoy</span><span>$ 96.840</span></div>
                        <div className="product-summary-row"><span>Productos en inventario</span><span>327</span></div>
                        <div className="product-summary-row"><span>Clientes registrados</span><span>184</span></div>
                        <div className="product-summary-row"><span>Ventas pendientes</span><span className="danger">5</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="product-quick-actions">
                    <div className="product-card-v2-title">Acciones rápidas</div>
                    <div className="product-quick-grid">
                      {quickActionsV2.map((a) => (
                        <div className="product-quick-item" key={a.label}>
                          <Icon name={a.icon} size={20} />
                          <span>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span className="sr-only">
            Captura del panel principal de SOLVEN mostrando ventas del día, gráfico de los últimos 7 días, productos más vendidos y alertas operativas.
          </span>

          <div className="product-claims">
            Multiusuario con roles · Auditoría completa · Backups automáticos · Acceso desde cualquier dispositivo
          </div>
        </div>
      </section>

      <div className="section-divider">· Plataforma ·</div>

      {/* PLATAFORMA (bento) */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">La plataforma</div>
            <h2>Una sola plataforma. Todas las operaciones del comercio.</h2>
          </div>

          <div className="bento-grid fade-in">
            <div className="bento-card large">
              <div className="bento-icon"><Icon name="cart" /></div>
              <div className="bento-title">Punto de Venta</div>
              <div className="bento-desc">
                Registra ventas en segundos, con soporte para lectoras de código de barras,
                pagos combinados y operaciones a cuenta corriente en un mismo flujo.
              </div>
              <div className="bento-visual">
                <div className="ticket-row"><span>Coca-Cola 500ml x2</span><span>$1.800</span></div>
                <div className="ticket-row"><span>Pan lactal</span><span>$1.200</span></div>
                <div className="ticket-row"><span>Detergente 750ml</span><span>$2.450</span></div>
                <div className="ticket-row"><span>Total</span><span>$5.450</span></div>
              </div>
            </div>

            <div className="bento-card large">
              <div className="bento-icon"><Icon name="box" /></div>
              <div className="bento-title">Inventario en tiempo real</div>
              <div className="bento-desc">
                Cada venta descuenta el stock automáticamente. Alertas de productos bajos,
                entradas y ajustes con trazabilidad completa.
              </div>
              <div className="bento-visual">
                <table className="stock-table">
                  <thead>
                    <tr><th>Producto</th><th>Stock</th><th></th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Aceite girasol 1L</td><td>42</td><td><span className="stock-badge">OK</span></td></tr>
                    <tr><td>Yerba mate 1kg</td><td>5</td><td><span className="stock-badge low">Bajo</span></td></tr>
                    <tr><td>Arroz 1kg</td><td>28</td><td><span className="stock-badge">OK</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon"><Icon name="users" /></div>
              <div className="bento-title">Clientes y cuenta corriente</div>
              <div className="bento-desc">
                Historial completo por cliente, saldo pendiente visible y registro de pagos
                parciales o totales en segundos.
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon"><Icon name="wallet" /></div>
              <div className="bento-title">Control de caja</div>
              <div className="bento-desc">
                Apertura, cierre y movimientos del día con cuadre automático y diferencias
                detectadas al instante.
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon"><Icon name="tag" /></div>
              <div className="bento-title">Promociones</div>
              <div className="bento-desc">
                Hasta 7 tipos de promoción, desde 2x1 hasta descuentos por categoría, aplicadas
                automáticamente en caja.
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon"><Icon name="chart" /></div>
              <div className="bento-title">Reportes y análisis</div>
              <div className="bento-desc">
                Ventas, ganancias, rentabilidad por producto y clientes con deuda en un panel
                claro y exportable.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider">· Industrias ·</div>

      {/* INDUSTRIAS */}
      <section className="section" id="industrias">
        <div className="container">
          <div className="section-head center">
            <div className="eyebrow">Industrias</div>
            <h2>Una plataforma. Múltiples verticales.</h2>
            <p className="section-sub">
              SOLVEN se adapta a los modelos operativos de cada rubro, sin necesidad de
              configuración técnica.
            </p>
          </div>

          <div className="industries-grid fade-in">
            <div className="industry-card">
              <div className="industry-icon"><Icon name="shopping-bag" size={20} /></div>
              <div className="industry-title">Retail y abarrotes</div>
              <div className="industry-desc">Catálogo amplio, rotación alta, ventas por código de barras.</div>
            </div>
            <div className="industry-card">
              <div className="industry-icon"><Icon name="cross" size={20} /></div>
              <div className="industry-title">Farmacia y perfumería</div>
              <div className="industry-desc">Trazabilidad de lote, ventas con receta, control de stock crítico.</div>
            </div>
            <div className="industry-card">
              <div className="industry-icon"><Icon name="wrench" size={20} /></div>
              <div className="industry-title">Ferretería y materiales</div>
              <div className="industry-desc">Catálogo técnico, ventas por bulto y unidad, presupuestos.</div>
            </div>
            <div className="industry-card">
              <div className="industry-icon"><Icon name="shirt" size={20} /></div>
              <div className="industry-title">Indumentaria y calzado</div>
              <div className="industry-desc">Variantes por talle/color, temporada y rotación.</div>
            </div>
            <div className="industry-card">
              <div className="industry-icon"><Icon name="utensils" size={20} /></div>
              <div className="industry-title">Gastronomía y kioscos</div>
              <div className="industry-desc">Alta frecuencia de venta, productos perecederos, turnos de caja.</div>
            </div>
            <div className="industry-card">
              <div className="industry-icon"><Icon name="settings" size={20} /></div>
              <div className="industry-title">Servicios y mantenimiento</div>
              <div className="industry-desc">Cotizaciones, órdenes de trabajo, cuenta corriente de clientes.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ARQUITECTURA */}
      <section className="section alt" id="modulos">
        <div className="container">
          <div className="section-head center">
            <div className="eyebrow">Arquitectura unificada</div>
            <h2>Cada módulo conectado. Una sola fuente de verdad.</h2>
          </div>

          <div className="arch-diagram fade-in">
            <div className="arch-node">
              <div className="arch-node-title">Ventas</div>
              <div className="arch-node-desc">Registro de operaciones contado y cuenta corriente.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Productos</div>
              <div className="arch-node-desc">Catálogo, precios, márgenes y categorías.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Inventario</div>
              <div className="arch-node-desc">Stock, movimientos y alertas de reposición.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Clientes</div>
              <div className="arch-node-desc">Perfiles, historial y saldos pendientes.</div>
            </div>
            <div className="arch-node core">
              <div className="arch-node-title">Núcleo SOLVEN</div>
              <div className="arch-node-desc">Una operación actualiza todos los módulos a la vez.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Caja</div>
              <div className="arch-node-desc">Apertura, cierre y arqueo diario.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Reportes</div>
              <div className="arch-node-desc">Análisis de ventas, productos y clientes.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Promociones</div>
              <div className="arch-node-desc">Reglas automáticas aplicadas en el POS.</div>
            </div>
            <div className="arch-node">
              <div className="arch-node-title">Gastos</div>
              <div className="arch-node-desc">Registro por categoría con impacto en resultados.</div>
            </div>
          </div>

          <div className="section-head center" id="infraestructura" style={{ marginTop: 64, marginBottom: 40 }}>
            <div className="eyebrow">Infraestructura</div>
            <h2>Construido sobre infraestructura de clase empresarial.</h2>
          </div>

          <div className="infra-band fade-in">
            <div className="infra-col">
              <div className="infra-title">Disponibilidad 99.9%</div>
              <div className="infra-desc">Arquitectura distribuida con redundancia y monitoreo activo 24/7.</div>
            </div>
            <div className="infra-col">
              <div className="infra-title">Cifrado de extremo a extremo</div>
              <div className="infra-desc">TLS 1.3 en tránsito, cifrado en reposo, llaves rotativas.</div>
            </div>
            <div className="infra-col">
              <div className="infra-title">Cumplimiento normativo</div>
              <div className="infra-desc">Marco compatible con AFIP, RG factura electrónica y normativa de protección de datos.</div>
            </div>
            <div className="infra-col">
              <div className="infra-title">Backups continuos</div>
              <div className="infra-desc">Respaldos automáticos con retención y recuperación punto en el tiempo.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRESENCIA / ALCANCE */}
      <section className="presence-band">
        <div className="container presence-grid">
          {[
            { number: "+12", label: "Provincias con comercios activos" },
            { number: "24/7", label: "Cobertura operativa de la plataforma" },
            { number: "99.9%", label: "Disponibilidad de servicio" },
            { number: "< 5 min", label: "Tiempo medio de respuesta del soporte" },
          ].map(({ number, label }) => (
            <div key={label} className="presence-item fade-in">
              <div className="presence-number">{number}</div>
              <div className="presence-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* POR QUÉ SOLVEN */}
      <section className="section" id="porque">
        <div className="container why-grid">
          <div>
            <div className="eyebrow">Por qué SOLVEN</div>
            <h2>Diseñado para la realidad de tu negocio</h2>
            <p className="section-sub">
              No es un ERP corporativo genérico. Es la plataforma que un comercio físico necesita
              para operar con datos, no con intuición.
            </p>

            <div className="why-list fade-in">
              <div className="why-item">
                <div className="why-icon"><Icon name="zap" size={18} /></div>
                <div>
                  <div className="why-item-title">Listo en minutos</div>
                  <div className="why-item-desc">
                    Crea tu cuenta y empieza a registrar operaciones el mismo día, sin instalaciones
                    ni configuraciones complejas.
                  </div>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon"><Icon name="store" size={18} /></div>
                <div>
                  <div className="why-item-title">Hecho para comercios físicos</div>
                  <div className="why-item-desc">
                    Pensado para el comercio argentino que necesita información real para crecer,
                    sin procesos innecesarios.
                  </div>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon"><Icon name="smartphone" size={18} /></div>
                <div>
                  <div className="why-item-title">Sin conocimiento técnico</div>
                  <div className="why-item-desc">
                    Interfaz clara y lenguaje simple. Si tu equipo puede usar WhatsApp, puede operar
                    SOLVEN desde el primer día.
                  </div>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon"><Icon name="shield" size={18} /></div>
                <div>
                  <div className="why-item-title">Datos seguros en la nube</div>
                  <div className="why-item-desc">
                    Toda la información se respalda automáticamente y está disponible desde
                    cualquier dispositivo, en cualquier momento.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="why-card-stack fade-in">
            <div className="why-card">
              <div className="why-card-header">
                <div className="why-card-icon"><Icon name="trending-up" size={16} /></div>
                <div className="why-card-title">Ventas del mes</div>
              </div>
              <div className="why-metric">$38.750</div>
              <div className="why-metric-sub success">▲ 24,3% vs mes anterior</div>
            </div>
            <div className="why-card">
              <div className="why-card-header">
                <div className="why-card-icon"><Icon name="alert-triangle" size={16} /></div>
                <div className="why-card-title">Alerta de stock</div>
              </div>
              <div className="why-metric warning">12</div>
              <div className="why-metric-sub">productos necesitan reposición</div>
            </div>
            <div className="why-card">
              <div className="why-card-header">
                <div className="why-card-icon"><Icon name="check-circle" size={16} /></div>
                <div className="why-card-title">Caja cerrada</div>
              </div>
              <div className="why-metric success">$0,00</div>
              <div className="why-metric-sub success">Diferencia — cuadre correcto</div>
            </div>
          </div>
        </div>
      </section>

      {/* INDICADORES */}
      <section className="indicators">
        <div className="container indicators-grid">
          {[
            { number: "+500", label: "Negocios activos" },
            { number: "34%", label: "Aumento promedio en ganancias" },
            { number: "5 min", label: "Para empezar a operar" },
            { number: "0", label: "Conocimiento técnico requerido" },
          ].map(({ number, label }) => (
            <div key={label} className="indicator fade-in">
              <div className="indicator-number">{number}</div>
              <div className="indicator-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <div className="eyebrow">Testimonios</div>
            <h2>Lo que dicen los dueños de negocios</h2>
            <p className="section-sub">Negocios reales que cambiaron cómo operan.</p>
          </div>

          <div className="testimonials-grid fade-in">
            {[
              { initials: "MR", name: "María Rodríguez", role: "Dueña de tienda de abarrotes", text: "Antes cerraba el día sin saber cuánto había ganado realmente. Ahora con SOLVEN veo todo en tiempo real. Fue un cambio total." },
              { initials: "CG", name: "Carlos Gómez", role: "Farmacia independiente", text: "El control de los clientes que compran fiado era un caos. Ahora sé exactamente quién me debe, cuánto y desde cuándo." },
              { initials: "LA", name: "Laura Andrade", role: "Minimarket familiar", text: "Empecé a usar las promociones de SOLVEN y en el primer mes aumenté mis ventas un 30%. Las 2x1 en bebidas funcionaron perfecto." },
            ].map(({ initials, name, role, text }) => (
              <div key={name} className="testimonial-card">
                <div className="testimonial-quote">&ldquo;</div>
                <p className="testimonial-text">{text}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{initials}</div>
                  <div>
                    <div className="testimonial-name">{name}</div>
                    <div className="testimonial-role">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section className="section" id="precio">
        <div className="container">
          <div className="pricing-block fade-in">
            <div className="pricing-col-1">
              <div className="pricing-eyebrow">Precio</div>
              <h2>Un único plan. Toda la plataforma.</h2>
              <p className="pricing-desc">
                Sin tiers ocultos, sin add-ons, sin sorpresas en la factura. Empresa o comercio
                independiente, todos acceden a las mismas capacidades.
              </p>
              <div className="pricing-price">$ 15.999</div>
              <div className="pricing-period">ARS / mes</div>
              <Link href="/register" className="pricing-btn">Comenzar prueba de 14 días</Link>
              <div className="pricing-fine">Se requiere tarjeta · Cobro automático al finalizar el período de prueba</div>
            </div>

            <ul className="pricing-features">
              {[
                "Ventas y POS ilimitados",
                "Inventario y productos ilimitados",
                "Clientes y cuenta corriente",
                "Caja y arqueo diario",
                "Reportes y análisis",
              ].map((feat) => (
                <li key={feat}>
                  <span className="pricing-check"><Icon name="check" size={16} /></span>
                  {feat}
                </li>
              ))}
            </ul>

            <ul className="pricing-features">
              {[
                "Módulo de promociones (7 tipos)",
                "Gastos por categoría",
                "Multiusuario con roles",
                "Actualizaciones automáticas",
                "Soporte humano incluido",
              ].map((feat) => (
                <li key={feat}>
                  <span className="pricing-check"><Icon name="check" size={16} /></span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="section-divider">· Compañía ·</div>

      {/* COMPAÑÍA */}
      <section className="section">
        <div className="container">
          <div className="company-grid fade-in">
            <div className="company-card">
              <div className="company-eyebrow">Compañía</div>
              <div className="company-title">Construida en Argentina, pensada para Latinoamérica.</div>
              <p className="company-desc">
                SOLVEN nace de operar con los comercios reales que mueven la economía local. Cada
                decisión de producto se valida en piso de venta antes de llegar a la plataforma.
              </p>
              <a href="#" className="company-link">Conocer la compañía →</a>
            </div>
            <div className="company-card">
              <div className="company-eyebrow">Seguridad</div>
              <div className="company-title">Tus datos, protegidos por diseño.</div>
              <p className="company-desc">
                Aplicamos principios de mínimo privilegio, separación de entornos y auditoría
                continua sobre toda la infraestructura.
              </p>
              <a href="#" className="company-link">Política de seguridad →</a>
            </div>
            <div className="company-card">
              <div className="company-eyebrow">Ecosistema</div>
              <div className="company-title">Una red de implementadores y contadores certificados.</div>
              <p className="company-desc">
                Profesionales habilitados para acompañar a los comercios en la puesta en marcha y
                la operación diaria.
              </p>
              <a href="#" className="company-link">Sumarse al programa →</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-section">
        <div className="container">
          <h2>Tu negocio merece operar con claridad.</h2>
          <p>Empieza hoy. En menos de cinco minutos estás registrando tu primera venta.</p>
          <div className="cta-actions">
            <Link href="/register" className="btn-hero">
              Comenzar gratis
              <Icon name="arrow-right" size={16} />
            </Link>
            <a href="#precio" className="btn-hero-secondary">Hablar con ventas</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <div className="nav-logo-icon">S</div>
                <span className="nav-logo-text" style={{ color: "white" }}>SOLVEN</span>
              </div>
              <p className="footer-tagline">
                Plataforma de gestión empresarial para comercios.
              </p>
              <span className="footer-locale">Argentina ▾</span>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Plataforma</div>
              <ul>
                <li><a href="#features">Funciones</a></li>
                <li><a href="#modulos">Módulos</a></li>
                <li><a href="#infraestructura">Arquitectura</a></li>
                <li><a href="#infraestructura">Seguridad</a></li>
                <li><a href="#recursos">Roadmap</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Industrias</div>
              <ul>
                <li><a href="#industrias">Retail</a></li>
                <li><a href="#industrias">Farmacia</a></li>
                <li><a href="#industrias">Ferretería</a></li>
                <li><a href="#industrias">Gastronomía</a></li>
                <li><a href="#industrias">Servicios</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Compañía</div>
              <ul>
                <li><a href="#porque">Sobre SOLVEN</a></li>
                <li><a href="#">Partners</a></li>
                <li><a href="#">Prensa</a></li>
                <li><a href="#">Carreras</a></li>
                <li><a href="#precio">Contacto</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <ul>
                <li><a href="#">Privacidad</a></li>
                <li><a href="#">Términos</a></li>
                <li><a href="#">Cookies</a></li>
                <li><a href="#">Cumplimiento</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© 2026 SOLVEN. Todos los derechos reservados.</span>
            <span className="footer-version">Versión de plataforma 2.0 · Última actualización: 06/2026</span>
            <div className="footer-social">
              <a href="#" aria-label="SOLVEN en LinkedIn"><Icon name="social" size={16} /></a>
              <a href="#" aria-label="SOLVEN en Instagram"><Icon name="social" size={16} /></a>
              <a href="#" aria-label="SOLVEN en X"><Icon name="social" size={16} /></a>
            </div>
          </div>
        </div>
      </footer>

      <LandingScroll />
      <NoaChat />
    </div>
  );
}
