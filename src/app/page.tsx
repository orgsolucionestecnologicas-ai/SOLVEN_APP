import { DashboardSummary } from "./ui/dashboard-summary";

const navigationItems = [
  "Panel",
  "Productos",
  "Ventas",
  "Gastos",
  "Clientes",
  "Deudas"
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="bg-slate-950 px-5 py-5 text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-xl font-semibold tracking-normal">SOLVEN</p>
            <p className="mt-1 text-sm text-slate-400">Control del negocio</p>
          </div>
          <div className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-emerald-950 lg:mt-6 lg:inline-block">
            Inicial
          </div>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
          {navigationItems.map((item) => (
            <div
              className={
                item === "Panel"
                  ? "whitespace-nowrap rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950"
                  : "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-400"
              }
              key={item}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
          <p className="text-sm font-medium text-slate-500">Panel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Resumen del negocio
          </h1>
        </div>

        <DashboardSummary />
      </main>
    </div>
  );
}
