import { AlertTriangle, Database, Map, Package, ScrollText, Tag, Warehouse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import "../menu/menu-modern.css";

const items = [
  {
    titleKey: "dataMenu.productsTitle",
    descriptionKey: "dataMenu.productsDesc",
    path: "/data/products",
    icon: Package,
  },
  {
    titleKey: "dataMenu.stockTitle",
    descriptionKey: "dataMenu.stockDesc",
    path: "/data/stock",
    icon: Warehouse,
  },
  {
    titleKey: "dataMenu.pricesTitle",
    descriptionKey: "dataMenu.pricesDesc",
    path: "/data/prices",
    icon: Tag,
  },
  {
    titleKey: "dataMenu.locationsTitle",
    descriptionKey: "dataMenu.locationsDesc",
    path: "/data/locations",
    icon: Map,
  },
  {
    titleKey: "dataMenu.correctionsTitle",
    descriptionKey: "dataMenu.correctionsDesc",
    path: "/data/history",
    icon: ScrollText,
  },
  {
    titleKey: "dataMenu.problemsTitle",
    descriptionKey: "dataMenu.problemsDesc",
    path: "/data/problems",
    icon: AlertTriangle,
  },
];

export default function DataMenuModern() {
  const navigate = useNavigate();
  const { t } = useAppPreferences();

  return (
    <PageShell
      title={t("dataMenu.title")}
      subtitle={t("dataMenu.subtitle")}
      icon={<Database size={26} />}
      backTo="/menu"
      compact
    >
      <div className="app-grid app-grid--cards">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              className="card selectable"
              onClick={() => navigate(item.path)}
            >
              <div className="menu-card__icon">
                <Icon size={22} />
              </div>
              <div className="card-title" style={{ marginTop: 14 }}>
                {t(item.titleKey)}
              </div>
              <div className="card-desc">{t(item.descriptionKey)}</div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
