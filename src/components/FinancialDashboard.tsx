import { BarChart3, CalendarDays, Download, Euro, PackageSearch, PieChart, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { InventoryItem } from "../types";

interface FinancialDashboardProps {
  inventory: InventoryItem[];
}

interface CategoryMetric {
  name: string;
  quantity: number;
  purchaseValue: number;
  salesValue: number;
  margin: number;
}

interface MonthlyMetric {
  key: string;
  label: string;
  stockValue: number;
  margin: number;
  movements: number;
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getPurchaseValue(item: InventoryItem) {
  return item.quantity * (item.purchasePrice ?? 0);
}

function getSalesValue(item: InventoryItem) {
  return item.quantity * (item.salesPrice ?? 0);
}

function getMonthKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}


function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getReportDate() {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
}

function buildMonthlyMetrics(inventory: InventoryItem[]): MonthlyMetric[] {
  const currentMonth = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (5 - index), 1);
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: getMonthLabel(key),
      stockValue: 0,
      margin: 0,
      movements: 0,
    };
  });

  const metricsByMonth = new Map(months.map((month) => [month.key, month]));

  inventory.forEach((item) => {
    const monthKey = getMonthKey(item.lastUpdated);
    const metric = metricsByMonth.get(monthKey);
    if (!metric) return;

    metric.stockValue += getPurchaseValue(item);
    metric.margin += getSalesValue(item) - getPurchaseValue(item);
    metric.movements += Math.abs(item.lastMovement ?? item.quantity);
  });

  return months;
}

export function FinancialDashboard({ inventory }: FinancialDashboardProps) {
  const totalPurchaseValue = inventory.reduce((sum, item) => sum + getPurchaseValue(item), 0);
  const totalSalesValue = inventory.reduce((sum, item) => sum + getSalesValue(item), 0);
  const potentialMargin = totalSalesValue - totalPurchaseValue;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const pricedItems = inventory.filter((item) => item.purchasePrice || item.salesPrice).length;
  const marginRate = totalSalesValue > 0 ? (potentialMargin / totalSalesValue) * 100 : 0;

  const categoryMetrics = Object.values(
    inventory.reduce<Record<string, CategoryMetric>>((acc, item) => {
      const name = item.category?.trim() || "Sans catégorie";
      if (!acc[name]) {
        acc[name] = { name, quantity: 0, purchaseValue: 0, salesValue: 0, margin: 0 };
      }

      const purchaseValue = getPurchaseValue(item);
      const salesValue = getSalesValue(item);
      acc[name].quantity += item.quantity;
      acc[name].purchaseValue += purchaseValue;
      acc[name].salesValue += salesValue;
      acc[name].margin += salesValue - purchaseValue;
      return acc;
    }, {}),
  ).sort((a, b) => b.purchaseValue - a.purchaseValue);

  const topCategories = categoryMetrics.slice(0, 5);
  const monthlyMetrics = buildMonthlyMetrics(inventory);
  const maxCategoryValue = Math.max(...topCategories.map((category) => category.purchaseValue), 1);
  const maxMonthlyValue = Math.max(...monthlyMetrics.map((month) => month.stockValue), 1);

  const handleExportPdf = () => {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
    if (!reportWindow) {
      window.print();
      return;
    }

    const generatedAt = getReportDate();
    const topCategoryRows = topCategories
      .map((category, index) => {
        const width = Math.max(8, (category.purchaseValue / maxCategoryValue) * 100);
        return `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(category.name)}</strong><div class="bar"><span style="width:${width}%"></span></div></td>
            <td>${numberFormatter.format(category.quantity)}</td>
            <td>${formatCurrency(category.purchaseValue)}</td>
            <td>${formatCurrency(category.salesValue)}</td>
            <td>${formatCurrency(category.margin)}</td>
          </tr>
        `;
      })
      .join("");

    const monthlyRows = monthlyMetrics
      .map((month) => {
        const height = Math.max(6, (month.stockValue / maxMonthlyValue) * 100);
        return `
          <div class="month">
            <div class="month-chart"><span style="height:${height}%"></span></div>
            <strong>${escapeHtml(month.label)}</strong>
            <small>${formatCurrency(month.stockValue)}</small>
          </div>
        `;
      })
      .join("");

    const inventoryRows = inventory
      .slice()
      .sort((a, b) => getPurchaseValue(b) - getPurchaseValue(a))
      .slice(0, 20)
      .map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category?.trim() || "Sans catégorie")}</td>
          <td>${numberFormatter.format(item.quantity)}</td>
          <td>${formatCurrency(item.purchasePrice ?? 0)}</td>
          <td>${formatCurrency(item.salesPrice ?? 0)}</td>
          <td>${formatCurrency(getPurchaseValue(item))}</td>
        </tr>
      `)
      .join("");

    reportWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Rapport financier inventaire</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #1c1917; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; }
            main { max-width: 980px; margin: 0 auto; padding: 28px; background: #fff; }
            header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #7c3aed; padding-bottom: 18px; margin-bottom: 22px; }
            h1 { margin: 0; font-size: 28px; letter-spacing: -0.04em; }
            h2 { margin: 0 0 10px; font-size: 16px; }
            p { margin: 4px 0; color: #57534e; }
            .badge { display: inline-block; margin-bottom: 8px; padding: 5px 9px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
            .meta { text-align: right; font-size: 12px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .kpi { border: 1px solid #e7e5e4; border-radius: 16px; padding: 13px; background: linear-gradient(180deg, #fff, #fafaf9); }
            .kpi span { display: block; color: #78716c; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
            .kpi strong { display: block; margin-top: 7px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; }
            .section { break-inside: avoid; border: 1px solid #e7e5e4; border-radius: 18px; padding: 16px; margin-top: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; color: #57534e; background: #f5f5f4; }
            th, td { padding: 9px 8px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
            .bar { height: 8px; width: 100%; overflow: hidden; border-radius: 999px; background: #ede9fe; margin-top: 6px; }
            .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #8b5cf6, #4f46e5); }
            .months { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; min-height: 170px; align-items: end; }
            .month { text-align: center; display: grid; gap: 6px; }
            .month-chart { height: 116px; display: flex; align-items: end; justify-content: center; border-radius: 14px; background: #f5f5f4; padding: 7px; }
            .month-chart span { width: 28px; min-height: 8px; border-radius: 999px 999px 0 0; background: linear-gradient(180deg, #38bdf8, #10b981); }
            .month strong { font-size: 11px; text-transform: uppercase; color: #44403c; }
            .month small { color: #78716c; }
            .footer { margin-top: 18px; color: #78716c; font-size: 11px; text-align: center; }
            .actions { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 0; background: #fff; }
            button { border: 0; border-radius: 12px; background: #7c3aed; color: white; padding: 10px 14px; font-weight: 800; cursor: pointer; }
            @media print { body { background: #fff; } main { padding: 0; } .actions { display: none; } .section { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <main>
            <div class="actions"><button onclick="window.print()">Télécharger / imprimer en PDF</button></div>
            <header>
              <div>
                <span class="badge">Finance</span>
                <h1>Rapport financier inventaire</h1>
                <p>Valeur du stock, marge potentielle, catégories importantes et évolution mensuelle.</p>
              </div>
              <div class="meta">
                <p><strong>Généré le</strong></p>
                <p>${escapeHtml(generatedAt)}</p>
                <p>${numberFormatter.format(inventory.length)} références · ${numberFormatter.format(totalQuantity)} unités</p>
              </div>
            </header>

            <section class="kpis">
              <div class="kpi"><span>Valeur stock</span><strong>${formatCurrency(totalPurchaseValue)}</strong></div>
              <div class="kpi"><span>CA potentiel</span><strong>${formatCurrency(totalSalesValue)}</strong></div>
              <div class="kpi"><span>Marge potentielle</span><strong>${formatCurrency(potentialMargin)}</strong></div>
              <div class="kpi"><span>Taux de marge</span><strong>${marginRate.toFixed(1)} %</strong></div>
            </section>

            <section class="section">
              <h2>Top catégories par valeur de stock</h2>
              <table>
                <thead><tr><th>#</th><th>Catégorie</th><th>Unités</th><th>Valeur stock</th><th>CA potentiel</th><th>Marge</th></tr></thead>
                <tbody>${topCategoryRows || `<tr><td colspan="6">Aucune catégorie valorisée.</td></tr>`}</tbody>
              </table>
            </section>

            <section class="section">
              <h2>Évolution mensuelle - 6 derniers mois</h2>
              <div class="months">${monthlyRows}</div>
            </section>

            <section class="section">
              <h2>Top 20 articles par valeur de stock</h2>
              <table>
                <thead><tr><th>Article</th><th>Catégorie</th><th>Qté</th><th>Prix achat</th><th>Prix vente</th><th>Valeur stock</th></tr></thead>
                <tbody>${inventoryRows || `<tr><td colspan="6">Aucun article en stock.</td></tr>`}</tbody>
              </table>
            </section>
            <p class="footer">Rapport généré depuis Inventaire Boutique. Les montants reposent sur les prix actuellement saisis dans l'inventaire.</p>
          </main>
        </body>
      </html>`);
    reportWindow.document.close();
    reportWindow.focus();
  };

  return (
    <section className="glass-card mobile-card space-y-5 print:shadow-none" id="financial-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
            Finance
          </span>
          <h2 className="mt-2 text-base font-bold tracking-tight text-stone-900">
            Dashboard financier
          </h2>
          <p className="mt-1 text-xs font-medium text-stone-500">
            Valeur du stock, marge potentielle et catégories clés.
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-600 px-3 text-xs font-bold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700 print:hidden"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard icon={<Euro className="h-4 w-4" />} label="Valeur stock" value={formatCurrency(totalPurchaseValue)} tone="emerald" />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="CA potentiel" value={formatCurrency(totalSalesValue)} tone="indigo" />
        <KpiCard icon={<BarChart3 className="h-4 w-4" />} label="Marge potentielle" value={formatCurrency(potentialMargin)} tone="violet" detail={`${marginRate.toFixed(1)} %`} />
        <KpiCard icon={<PackageSearch className="h-4 w-4" />} label="Articles valorisés" value={`${pricedItems}/${inventory.length}`} tone="amber" detail={`${numberFormatter.format(totalQuantity)} unités`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Valeur par catégorie</h3>
              <p className="text-[11px] font-medium text-stone-500">Top catégories par valeur d'achat stockée.</p>
            </div>
            <PieChart className="h-5 w-5 text-violet-500" />
          </div>

          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((category) => {
                const width = Math.max(8, (category.purchaseValue / maxCategoryValue) * 100);
                return (
                  <div key={category.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-bold text-stone-800">{category.name}</span>
                      <span className="shrink-0 font-mono font-bold text-stone-600">{formatCurrency(category.purchaseValue)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${width}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-stone-400">
                      <span>{numberFormatter.format(category.quantity)} unités</span>
                      <span>Marge {formatCurrency(category.margin)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="Ajoutez des prix d'achat pour visualiser les catégories importantes." />
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Évolution mensuelle</h3>
              <p className="text-[11px] font-medium text-stone-500">Vue sur les 6 derniers mois selon les dernières mises à jour.</p>
            </div>
            <CalendarDays className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="flex h-48 items-end gap-2 rounded-2xl bg-stone-50 p-3">
            {monthlyMetrics.map((month) => {
              const height = Math.max(6, (month.stockValue / maxMonthlyValue) * 100);
              return (
                <div key={month.key} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                  <div className="flex flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-9 rounded-t-xl bg-gradient-to-t from-emerald-500 to-indigo-400"
                      style={{ height: `${height}%` }}
                      title={`${month.label}: ${formatCurrency(month.stockValue)}`}
                    />
                  </div>
                  <span className="text-[9px] font-bold uppercase text-stone-500">{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-emerald-50 p-2 font-semibold text-emerald-700">
              Marge période : {formatCurrency(monthlyMetrics.reduce((sum, month) => sum + month.margin, 0))}
            </div>
            <div className="rounded-xl bg-indigo-50 p-2 font-semibold text-indigo-700">
              Mouvements : {numberFormatter.format(monthlyMetrics.reduce((sum, month) => sum + month.movements, 0))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail?: string; tone: "emerald" | "indigo" | "violet" | "amber" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/85 p-3 shadow-sm shadow-stone-900/5">
      <div className={`mb-3 inline-flex rounded-xl border p-2 ${toneClass}`}>{icon}</div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</span>
      <span className="mt-1 block font-mono text-sm font-black text-stone-900 sm:text-base">{value}</span>
      {detail && <span className="mt-1 block text-[10px] font-bold text-stone-500">{detail}</span>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-xs font-semibold text-stone-500">
      {message}
    </div>
  );
}
