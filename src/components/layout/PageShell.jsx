import { ChevronLeft, Moon, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppPreferences } from "../../core/preferences/AppPreferences";

export default function PageShell({
  title,
  subtitle,
  children,
  backTo = null,
  onBack = null,
  backLabel = "Powrot",
  actions = null,
  icon = null,
  compact = false,
}) {
  const navigate = useNavigate();
  const { language, languages, setLanguage, theme, toggleTheme, t } = useAppPreferences();
  const canGoBack = backTo !== null || typeof onBack === "function";

  function handleBackClick() {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    if (backTo !== null) {
      navigate(typeof backTo === "number" ? backTo : backTo);
    }
  }

  return (
    <div className={`page-shell ${compact ? "page-shell-compact" : ""}`}>
      <div className="page-shell__back-row">
        <div className="page-shell__start">
          {canGoBack ? (
            <button
              type="button"
              className="app-icon-button"
              onClick={handleBackClick}
              aria-label={backLabel || t("shell.back")}
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <div className="page-shell__pill">
              <Sparkles size={14} />
              {t("shell.brand")}
            </div>
          )}

          <div className="page-shell__preferences">
            <label className="page-shell__language">
              <span className="page-shell__preferences-label">{t("shell.languageLabel")}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="page-shell__select">
                {languages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="page-shell__theme-toggle"
              onClick={toggleTheme}
              aria-label={`${t("shell.themeLabel")}: ${theme === "dark" ? t("shell.themeDark") : t("shell.themeLight")}`}
              title={`${t("shell.themeLabel")}: ${theme === "dark" ? t("shell.themeDark") : t("shell.themeLight")}`}
            >
              <span className={`page-shell__theme-option ${theme === "light" ? "is-active" : ""}`}>
                <Sun size={14} />
                {t("shell.themeLight")}
              </span>
              <span className={`page-shell__theme-option ${theme === "dark" ? "is-active" : ""}`}>
                <Moon size={14} />
                {t("shell.themeDark")}
              </span>
            </button>
          </div>
        </div>

        {actions ? <div className="page-shell__actions">{actions}</div> : null}
      </div>

      <div className="page-shell__hero">
        <div className="page-shell__eyebrow">{t("shell.eyebrow")}</div>
        <div className="page-shell__title-row">
          {icon ? <div className="page-shell__icon">{icon}</div> : null}
          <div>
            <h1 className="page-shell__title">{title}</h1>
            {subtitle ? <p className="page-shell__subtitle">{subtitle}</p> : null}
          </div>
        </div>
      </div>

      <div className="page-shell__content">{children}</div>
    </div>
  );
}
