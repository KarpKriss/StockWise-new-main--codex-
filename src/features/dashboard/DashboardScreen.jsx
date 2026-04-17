import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import {
  fetchDashboardData,
  fetchDashboardExportRows,
  fetchDashboardFilters,
} from "../../core/api/dashboardApi";
import { formatMoney, formatNumber } from "../../core/utils/dashboardMetrics";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import { exportToCSV } from "../../utils/csvExport";
import "./dashboard.css";

function MetricCard({ label, value, hint }) {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-label">{label}</div>
      <div className="dashboard-card-value">{value}</div>
      {hint ? <div className="dashboard-card-hint">{hint}</div> : null}
    </div>
  );
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { locale, t } = useAppPreferences();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState("");
  const [years, setYears] = useState([currentYear]);
  const [dashboard, setDashboard] = useState({
    summary: {},
    zoneStats: [],
    source: "fallback",
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const monthOptions = useMemo(
    () => [
      { value: "", label: t("dashboard.allMonths") },
      ...Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, index, 1)),
      })),
    ],
    [locale, t]
  );

  useEffect(() => {
    let cancelled = false;

    fetchDashboardFilters()
      .then((result) => {
        if (cancelled) return;
        const nextYears = result.years?.length ? result.years : [currentYear];
        setYears(nextYears);
        if (!nextYears.includes(currentYear)) {
          setYear(nextYears[0]);
        }
      })
      .catch((filtersError) => {
        console.warn("DASHBOARD FILTERS ERROR:", filtersError);
      });

    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchDashboardData({ year, month });
        if (!cancelled) {
          setDashboard(data);
        }
      } catch (loadError) {
        console.error("DASHBOARD LOAD ERROR:", loadError);
        if (!cancelled) {
          setError(loadError.message || t("dashboard.loadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [year, month, refreshTick]);

  const summary = dashboard.summary || {};

  const handleExport = async () => {
    setExporting(true);

    try {
      const rows = await fetchDashboardExportRows({ year, month });

      exportToCSV({
        data: rows.summaryRows,
        columns: [
          { key: "metric", label: t("dashboard.metric") },
          { key: "value", label: t("dashboard.value") },
        ],
        fileName: `dashboard-summary-${year || "all"}-${month || "all"}.csv`,
      });

      exportToCSV({
        data: rows.financialRows,
        columns: [
          { key: "zone", label: t("dashboard.zone") },
          { key: "shortage_value", label: t("dashboard.shortageValue") },
          { key: "surplus_value", label: t("dashboard.surplusValue") },
          { key: "total_difference_value", label: t("dashboard.totalDifferenceValue") },
        ],
        fileName: `dashboard-finance-${year || "all"}-${month || "all"}.csv`,
      });
    } catch (exportError) {
      console.error("DASHBOARD EXPORT ERROR:", exportError);
      alert(exportError.message || t("dashboard.exportError"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-kicker">{t("dashboard.kicker")}</div>
          <h1 className="dashboard-title">
            <BarChart3 size={26} />
            {t("dashboard.title")}
          </h1>
          <p className="dashboard-subtitle">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="dashboard-actions">
          <button className="dashboard-secondary-button" onClick={() => navigate("/menu")}>
            {t("common.backToMenu")}
          </button>
          <button
            className="dashboard-secondary-button"
            onClick={() => setRefreshTick((value) => value + 1)}
          >
            <RefreshCw size={16} />
            {t("dashboard.refresh")}
          </button>
          <button
            className="dashboard-primary-button"
            disabled={exporting}
            onClick={handleExport}
          >
            <Download size={16} />
            {exporting ? t("dashboard.exporting") : t("dashboard.export")}
          </button>
        </div>
      </div>

      <div className="dashboard-filter-bar">
        <label className="dashboard-filter">
          <span>{t("dashboard.year")}</span>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="dashboard-filter">
          <span>{t("dashboard.month")}</span>
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {monthOptions.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="dashboard-source">
          {t("dashboard.source")}: <strong>{dashboard.source === "rpc" ? t("dashboard.sourceRpc") : t("dashboard.sourceFallback")}</strong>
        </div>
      </div>

      {error ? <div className="dashboard-error">{error}</div> : null}

      {loading ? (
        <div className="dashboard-loading">{t("dashboard.loading")}</div>
      ) : (
        <>
          <div className="dashboard-grid">
            <MetricCard
              label={t("dashboard.checkedLocations")}
              value={formatNumber(summary.checked_locations)}
              hint={t("dashboard.checkedLocationsHint")}
            />
            <MetricCard label={t("dashboard.operationsCount")} value={formatNumber(summary.operations_count)} />
            <MetricCard label={t("dashboard.shortagesCount")} value={formatNumber(summary.shortages_count)} />
            <MetricCard label={t("dashboard.surplusesCount")} value={formatNumber(summary.surpluses_count)} />
            <MetricCard label={t("dashboard.problemsCount")} value={formatNumber(summary.problems_count)} />
            <MetricCard label={t("dashboard.surplusValue")} value={formatMoney(summary.surplus_value)} />
            <MetricCard label={t("dashboard.shortageValue")} value={formatMoney(summary.shortage_value)} />
            <MetricCard
              label={t("dashboard.totalDifferenceValue")}
              value={formatMoney(summary.total_difference_value)}
            />
            <MetricCard
              label={t("dashboard.avgLocationControl")}
              value={`${formatNumber(summary.avg_location_control_minutes, 2)} min`}
            />
            <MetricCard
              label={t("dashboard.locationsPerHour")}
              value={formatNumber(summary.locations_per_hour, 2)}
            />
            <MetricCard
              label={t("dashboard.avgOperationsPerSession")}
              value={formatNumber(summary.avg_operations_per_session, 2)}
            />
            <MetricCard label={t("dashboard.sessionsCount")} value={formatNumber(summary.sessions_count)} />
            <MetricCard
              label={t("dashboard.avgSession")}
              value={`${formatNumber(summary.avg_session_minutes, 2)} min`}
            />
            <MetricCard
              label={t("dashboard.longestSession")}
              value={`${formatNumber(summary.longest_session_minutes, 2)} min`}
            />
          </div>

          <div className="dashboard-table-card">
            <div className="dashboard-table-header">
              <div>
                <h2>{t("dashboard.zoneStatsTitle")}</h2>
                <p>{t("dashboard.zoneStatsSubtitle")}</p>
              </div>
            </div>

            <div className="dashboard-table-scroll">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.zone")}</th>
                    <th>{t("dashboard.checkedLocations")}</th>
                    <th>{t("dashboard.operationsCount")}</th>
                    <th>{t("dashboard.shortagesCount")}</th>
                    <th>{t("dashboard.surplusesCount")}</th>
                    <th>{t("dashboard.problemsCount")}</th>
                    <th>{t("dashboard.shortageValue")}</th>
                    <th>{t("dashboard.surplusValue")}</th>
                    <th>{t("dashboard.totalDifferenceValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.zoneStats?.length ? (
                    dashboard.zoneStats.map((row) => (
                      <tr key={row.zone}>
                        <td>{row.zone}</td>
                        <td>{formatNumber(row.checked_locations)}</td>
                        <td>{formatNumber(row.operations_count)}</td>
                        <td>{formatNumber(row.shortages_count)}</td>
                        <td>{formatNumber(row.surpluses_count)}</td>
                        <td>{formatNumber(row.problems_count)}</td>
                        <td>{formatMoney(row.shortage_value)}</td>
                        <td>{formatMoney(row.surplus_value)}</td>
                        <td>{formatMoney(row.total_difference_value)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="dashboard-empty">
                        {t("dashboard.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
