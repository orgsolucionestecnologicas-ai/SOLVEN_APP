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

export default function LandingPage() {
  return (
    <div className={`landing-root ${sora.variable} ${dmSans.variable}`}>
      {/* NAV */}
      <nav>
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">S</div>
          <span className="nav-logo-text">SOLVEN</span>
          <span className="nav-logo-badge">2.0</span>
        </Link>

        <ul className="nav-links">
          <li><a href="#features">Funciones</a></li>
          <li><a href="#modulos">Módulos</a></li>
          <li><a href="#porque">Por qué SOLVEN</a></li>
          <li><a href="#precio">Precio</a></li>
        </ul>

        <div className="nav-cta">
          <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/login" className="btn-primary">
            Comenzar gratis
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-dots" />

        <div className="hero-badge">
          <div className="hero-badge-dot" />
          Plataforma de gestión para comercios físicos
        </div>

        <h1>Tu negocio,<br /><span>bajo control total</span></h1>

        <p className="hero-sub">
          SOLVEN te da visibilidad real sobre tus ventas, inventario, caja y clientes.
          Sin complejidad. Sin excusas. Solo claridad.
        </p>

        <div className="hero-actions">
          <Link href="/login" className="btn-hero">
            Empezar ahora — es gratis
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <a href="#features" className="btn-hero-secondary">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" /></svg>
            Ver cómo funciona
          </a>
        </div>

        <div className="hero-trust">
          <div className="hero-trust-item">
            <svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            14 días de prueba gratis
          </div>
          <div className="hero-trust-item">
            <svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            Configuración en minutos
          </div>
          <div className="hero-trust-item">
            <svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            Soporte incluido
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <div className="preview-section">
        <div className="preview-wrapper">
          <div className="preview-glow" />
          <div className="preview-card">
            <div className="preview-topbar">
              <div className="preview-dot red" />
              <div className="preview-dot yellow" />
              <div className="preview-dot green" />
              <div className="preview-url">solven-app.vercel.app/dashboard</div>
            </div>
            <div className="preview-inner">
              <div className="preview-sidebar">
                <div className="preview-logo">
                  <div className="preview-logo-box">
                    <div className="preview-logo-sq">S</div>
                    <span className="preview-logo-name">SOLVEN</span>
                  </div>
                </div>
                {["Inicio", "Ventas", "Productos", "Clientes", "Caja", "Reportes", "Promociones"].map((item, i) => (
                  <div key={item} className={`preview-nav-item${i === 0 ? " active" : ""}`}>
                    <div className="preview-nav-dot" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="preview-content">
                <div className="preview-header-row">
                  <div>
                    <div className="preview-title">Hola, Propietario 👋</div>
                    <div className="preview-subtitle">Aquí tienes el resumen de tu negocio</div>
                  </div>
                </div>
                <div className="preview-cards">
                  <div className="preview-card-item">
                    <div className="preview-card-label">Ventas del día</div>
                    <div className="preview-card-value" style={{ color: "#7c3aed" }}>$2,450</div>
                    <div className="preview-card-change">▲ 18.6% vs ayer</div>
                  </div>
                  <div className="preview-card-item">
                    <div className="preview-card-label">Ventas del mes</div>
                    <div className="preview-card-value" style={{ color: "#059669" }}>$38,750</div>
                    <div className="preview-card-change">▲ 24.3% vs anterior</div>
                  </div>
                  <div className="preview-card-item">
                    <div className="preview-card-label">Ganancia del día</div>
                    <div className="preview-card-value" style={{ color: "#2563eb" }}>$980</div>
                    <div className="preview-card-change">▲ 15.2% vs ayer</div>
                  </div>
                  <div className="preview-card-item">
                    <div className="preview-card-label">Productos bajos</div>
                    <div className="preview-card-value" style={{ color: "#d97706" }}>12</div>
                    <div className="preview-card-change" style={{ color: "#d97706" }}>Ver inventario →</div>
                  </div>
                </div>
                <div className="preview-chart-area">
                  {[40, 55, 35, 70, 60, 90, 75, 85, 65, 95, 80, 100].map((h, i) => (
                    <div key={i} className="preview-bar" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="stats-section">
        <div className="stats-bg" />
        <div className="stats-grid">
          {[
            { pre: "+", highlight: "500", suf: "", label: "Negocios activos" },
            { pre: "", highlight: "34", suf: "%", label: "Aumento promedio en ganancias" },
            { pre: "", highlight: "5", suf: "min", label: "Para empezar a usar" },
            { pre: "", highlight: "0", suf: "", label: "Conocimiento técnico requerido" },
          ].map(({ pre, highlight, suf, label }) => (
            <div key={label} className="stat-item fade-in">
              <div className="stat-number">{pre}<span>{highlight}</span>{suf}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features" style={{ textAlign: "center" }}>
        <div className="section-label">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          Funcionalidades
        </div>
        <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
          Todo lo que necesitas para gestionar tu negocio
        </h2>
        <p className="section-sub" style={{ margin: "0 auto 56px" }}>
          Diseñado para dueños de negocios físicos que quieren control real sin complicaciones.
        </p>

        <div className="features-grid fade-in">
          {[
            { bg: "#f5f3ff", emoji: "🛒", title: "Punto de venta inteligente", desc: "Registra ventas en segundos. Compatible con lectoras de código de barras. Contado y crédito (fiado) en un solo flujo." },
            { bg: "#f0fdf4", emoji: "📦", title: "Inventario en tiempo real", desc: "Cada venta descuenta automáticamente del stock. Alertas de productos bajos. Entradas y ajustes con trazabilidad completa." },
            { bg: "#eff6ff", emoji: "📊", title: "Reportes que hablan claro", desc: "Ventas, ganancias, productos más vendidos, clientes con deuda. Todo en un panel que cualquier persona puede entender." },
            { bg: "#fefce8", emoji: "🏷️", title: "Promociones poderosas", desc: "Crea 2x1, descuentos por categoría, productos casados y más. Se aplican automáticamente en caja." },
            { bg: "#fff7ed", emoji: "👥", title: "Control de clientes y deudas", desc: "Historial completo de cada cliente. Saldo pendiente visible. Registro de pagos parciales o totales en segundos." },
            { bg: "#fdf4ff", emoji: "💰", title: "Caja cuadrada siempre", desc: "Abre y cierra la caja con total control. Cada peso explicado. Diferencias detectadas al instante." },
          ].map(({ bg, emoji, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon" style={{ background: bg }}>{emoji}</div>
              <div className="feature-title">{title}</div>
              <div className="feature-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section className="section" id="modulos" style={{ background: "var(--off-white)", textAlign: "center" }}>
        <div className="section-label">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          Módulos
        </div>
        <h2 className="section-title" style={{ margin: "0 auto 16px" }}>Un sistema completo, integrado</h2>
        <p className="section-sub" style={{ margin: "0 auto 56px" }}>
          Todos los módulos se conectan entre sí. Una venta afecta inventario, caja y clientes automáticamente.
        </p>

        <div className="modules-grid fade-in">
          {[
            { emoji: "🛒", name: "Ventas / POS", desc: "Contado, crédito y devoluciones. Historial del día siempre disponible." },
            { emoji: "📦", name: "Productos", desc: "Catálogo con categorías, precios, márgenes y códigos SKU." },
            { emoji: "📊", name: "Inventario", desc: "Movimientos, entradas, ajustes y alertas de stock bajo." },
            { emoji: "👥", name: "Clientes", desc: "Perfiles, historial de compras, deudas y pagos." },
            { emoji: "💰", name: "Caja", desc: "Apertura, cierre, movimientos y cuadre diario." },
            { emoji: "📈", name: "Reportes", desc: "Análisis de ventas, productos, clientes y rentabilidad." },
            { emoji: "🏷️", name: "Promociones", desc: "7 tipos de promoción. Automáticas o por código." },
            { emoji: "💸", name: "Gastos", desc: "Registro por categoría. Impacto en resultados visible." },
          ].map(({ emoji, name, desc }) => (
            <div key={name} className="module-card">
              <span className="module-emoji">{emoji}</span>
              <div className="module-name">{name}</div>
              <div className="module-desc">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY SOLVEN */}
      <section className="why-section" id="porque">
        <div className="why-grid">
          <div>
            <div className="section-label">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
              Por qué SOLVEN
            </div>
            <h2 className="section-title">Diseñado para la realidad de tu negocio</h2>
            <p className="section-sub">
              No somos un ERP corporativo. Somos la herramienta que el dueño de un negocio físico necesita para dejar de operar a ciegas.
            </p>

            <div className="why-list fade-in">
              {[
                { icon: "⚡", title: "Listo en 5 minutos", desc: "Sin instalaciones, sin configuraciones complejas. Abre tu cuenta y empieza a registrar ventas hoy." },
                { icon: "🎯", title: "Hecho para comercios físicos", desc: "Pensado para el comercio físico argentino que quiere crecer con información real, sin vueltas y sin complicaciones." },
                { icon: "📱", title: "Sin conocimiento técnico", desc: "Si puedes usar WhatsApp, puedes usar SOLVEN. Interfaz clara, lenguaje simple, cero curva de aprendizaje." },
                { icon: "🔒", title: "Tus datos, seguros siempre", desc: "Todo en la nube. Accesible desde cualquier dispositivo. Nunca pierdas información." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="why-item">
                  <div className="why-icon">{icon}</div>
                  <div>
                    <div className="why-item-title">{title}</div>
                    <div className="why-item-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="why-visual fade-in">
            <div className="why-card-stack">
              <div className="why-card card-1">
                <div className="why-card-header">
                  <div className="why-card-icon" style={{ background: "#f5f3ff" }}>📊</div>
                  <div className="why-card-title">Ventas del mes</div>
                </div>
                <div className="why-metric" style={{ color: "#7c3aed" }}>$38,750</div>
                <div className="why-metric-sub" style={{ color: "#22c55e" }}>▲ 24.3% vs mes anterior</div>
              </div>
              <div className="why-card card-2">
                <div className="why-card-header">
                  <div className="why-card-icon" style={{ background: "#fef3c7" }}>⚠️</div>
                  <div className="why-card-title">Alerta de stock</div>
                </div>
                <div className="why-metric" style={{ color: "#d97706" }}>12</div>
                <div className="why-metric-sub">productos necesitan reposición</div>
              </div>
              <div className="why-card card-3">
                <div className="why-card-header">
                  <div className="why-card-icon" style={{ background: "#f0fdf4" }}>✅</div>
                  <div className="why-card-title">Caja cerrada</div>
                </div>
                <div className="why-metric" style={{ color: "#16a34a" }}>$0.00</div>
                <div className="why-metric-sub" style={{ color: "#22c55e" }}>Diferencia — Cuadre correcto</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div style={{ textAlign: "center" }}>
          <div className="section-label" style={{ justifyContent: "center" }}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            Testimonios
          </div>
          <h2 className="section-title" style={{ margin: "0 auto 16px" }}>Lo que dicen los dueños de negocios</h2>
          <p className="section-sub" style={{ margin: "0 auto" }}>Negocios reales que cambiaron cómo operan.</p>
        </div>

        <div className="testimonials-grid fade-in">
          {[
            { color: "#7c3aed", initials: "MR", name: "María Rodríguez", role: "Dueña de tienda de abarrotes", text: "Antes cerraba el día sin saber cuánto había ganado realmente. Ahora con SOLVEN veo todo en tiempo real. Fue un cambio total." },
            { color: "#059669", initials: "CG", name: "Carlos Gómez", role: "Farmacia independiente", text: "El control de los clientes que compran fiado era un caos. Ahora sé exactamente quién me debe, cuánto y desde cuándo." },
            { color: "#d97706", initials: "LA", name: "Laura Andrade", role: "Minimarket familiar", text: "Empecé a usar las promociones de SOLVEN y en el primer mes aumenté mis ventas un 30%. Las 2x1 en bebidas funcionaron perfecto." },
          ].map(({ color, initials, name, role, text }) => (
            <div key={name} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">&ldquo;{text}&rdquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: color }}>{initials}</div>
                <div>
                  <div className="testimonial-name">{name}</div>
                  <div className="testimonial-role">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="precio">
        <div className="section-label" style={{ justifyContent: "center" }}>
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
          Precio
        </div>
        <h2 className="section-title" style={{ margin: "0 auto 16px" }}>Un precio justo. Todo incluido.</h2>
        <p className="section-sub" style={{ margin: "0 auto" }}>Sin sorpresas. Sin funciones escondidas. Sin letras pequeñas.</p>

        <div className="pricing-card fade-in">
          <div className="pricing-bg" />
          <div className="pricing-badge">✦ Plan completo</div>
          <div className="pricing-price">$ 15.999 ARS / mes</div>

          <ul className="pricing-features">
            {[
              "Ventas y punto de venta ilimitadas",
              "Inventario y productos ilimitados",
              "Gestión de clientes y deudas",
              "Control de caja completo",
              "Reportes y análisis en tiempo real",
              "Módulo de promociones (7 tipos)",
              "Soporte incluido",
              "Actualizaciones automáticas",
            ].map((feat) => (
              <li key={feat}>
                <div className="pricing-check">✓</div>
                {feat}
              </li>
            ))}
          </ul>

          <Link href="/login" className="pricing-btn">Comenzar ahora — 14 días gratis</Link>
          <div className="pricing-guarantee">Se requiere tarjeta · Cobramos automáticamente al vencer el período de prueba</div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-bg" />
        <h2>¿Listo para tener control real de tu negocio?</h2>
        <p>Únete a cientos de comercios que ya operan con claridad y confianza.</p>
        <div className="cta-actions">
          <Link href="/login" className="btn-cta-white">
            Empezar gratis hoy
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <a href="#features" className="btn-cta-outline">Ver funcionalidades</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          <div className="nav-logo-icon">S</div>
          <span className="nav-logo-text" style={{ color: "rgba(255,255,255,0.8)" }}>SOLVEN</span>
          <span className="nav-logo-badge">2.0</span>
        </div>
        <span className="footer-copy">© 2026 SOLVEN. Todos los derechos reservados.</span>
        <ul className="footer-links">
          <li><a href="#">Privacidad</a></li>
          <li><a href="#">Términos</a></li>
          <li><a href="#">Soporte</a></li>
        </ul>
      </footer>

      <LandingScroll />
      <NoaChat />
    </div>
  );
}
