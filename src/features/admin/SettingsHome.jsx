import { ArrowRight, Camera, Download, FileText, Settings2, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import "../../features/menu/menu-modern.css";

const SETTINGS_ITEMS = [
  {
    titleKey: "settings.usersTitle",
    descriptionKey: "settings.usersDesc",
    path: "/admin/users",
    icon: Users,
  },
  {
    titleKey: "settings.processTitle",
    descriptionKey: "settings.processDesc",
    path: "/admin/process-config",
    icon: SlidersHorizontal,
  },
  {
    titleKey: "settings.scanningTitle",
    description: "Wlaczanie kamery, wybór pol procesu i formatow kodow dla telefonow operatorow.",
    descriptionKey: "settings.scanningDesc",
    path: "/admin/scanning",
    icon: Camera,
  },
  {
    titleKey: "settings.importExportTitle",
    descriptionKey: "settings.importExportDesc",
    path: "/admin/import-export",
    icon: Download,
  },
  {
    titleKey: "settings.logsTitle",
    descriptionKey: "settings.logsDesc",
    path: "/admin/logs",
    icon: FileText,
  },
  {
    titleKey: "settings.statusesTitle",
    descriptionKey: "settings.statusesDesc",
    path: "/admin/statuses",
    icon: ShieldCheck,
  },
];

export default function SettingsHome() {
  const navigate = useNavigate();
  const { t } = useAppPreferences();

  return (
    <PageShell
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      icon={<Settings2 size={26} />}
      backTo="/menu"
      backLabel={t("common.backToMenu")}
      compact
    >
      <div className="menu-grid">
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              className="menu-card role-admin"
              onClick={() => navigate(item.path)}
            >
              <div className="menu-card__icon">
                <Icon size={22} />
              </div>
              <div className="menu-card__content">
                <div className="menu-card__title">{t(item.titleKey)}</div>
                <div className="menu-card__desc">{t(item.descriptionKey)}</div>
                <div
                  style={{
                    marginTop: 12,
                    color: "var(--app-primary-strong)",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t("common.openSection")} <ArrowRight size={14} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}

