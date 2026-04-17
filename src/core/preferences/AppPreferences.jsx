import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "stockwise-language";
const THEME_STORAGE_KEY = "stockwise-theme";

const TRANSLATIONS = {
  pl: {
    shell: {
      eyebrow: "Warehouse Flow",
      brand: "StockWise",
      themeLight: "Light",
      themeDark: "Dark",
      languageLabel: "Jezyk",
      themeLabel: "Motyw",
      back: "Powrot",
    },
    common: {
      warehouse: "Magazyn",
      loading: "Ladowanie...",
      cancel: "Anuluj",
      close: "Zamknij",
      save: "Zapisz",
    },
    menu: {
      greeting: "Czesc, {{name}}",
      subtitle: "Wybierz obszar pracy i przejdz od razu do potrzebnego modulu.",
      quickStart: "Szybki start",
      logout: "Wyloguj",
      logoutLoading: "Wylogowuje...",
      workspace: "Twoj panel roboczy",
      role: "Rola",
      noAssignedWarehouse: "Brak przypisanego magazynu",
      process: "Proces",
      history: "Historia",
      data: "Dane",
      dashboard: "Statystyki",
      settings: "Ustawienia",
      processDesc: "Operacje terenowe, skanowanie i sesje pracy",
      historyDesc: "Wyniki inwentaryzacji i przeglad operacji",
      dataDesc: "Referencje, importy i historia zmian",
      dashboardDesc: "Metryki, tempo pracy i dane finansowe",
      settingsDesc: "Panel administracyjny, konfiguracja i statusy",
      qrTitle: "QR do logowania na telefonie",
      qrDescription:
        "Zeskanuj ten kod z dowolnego komputera albo monitora, aby szybko otworzyc ekran logowania StockWise na telefonie operatora.",
      loginLink: "Link do logowania:",
      qrHint:
        "Jesli operator pracuje na innym urzadzeniu, wystarczy zeskanowac QR i zalogowac sie standardowo.",
      quickStartTitle: "Szybki start gap inventory",
      quickStartSubtitle:
        "Zeskanuj najblizsza lokalizacje, a system dobierze najlepszy kierunek rozpoczecia kontroli.",
      startLocation: "Lokalizacja startowa",
      startLocationHint:
        "Moze to byc dowolna lokalizacja z mapy magazynu w poblizu miejsca, od ktorego operator chce ruszyc.",
      scanLocation: "Skan lokalizacji",
      locationPlaceholder: "Np. A.01.001.D.3",
      runQuickStart: "Uruchom szybki start",
      scanLocationAria: "Otworz skaner lokalizacji dla szybkiego startu",
      scanModalTitle: "Skanuj lokalizacje startowa",
      scanModalDescription:
        "Zeskanuj kod lokalizacji aparatem telefonu albo wgraj zdjecie, aby od razu uruchomic szybki start pustych lokalizacji.",
      quickStartError: "Zeskanuj lub wpisz lokalizacje, od ktorej chcesz zaczac.",
      quickStartInitError: "Nie udalo sie uruchomic szybkiego startu.",
      sessionLogoutMessage: "Zamykam sesje i wylogowuje operatora ze StockWise...",
    },
    auth: {
      brandSubtitle: "Warehouse operations, calmer, cleaner, clearer.",
      site: "Magazyn",
      chooseSite: "Wybierz magazyn",
      login: "Login",
      loginPlaceholder: "Wpisz login",
      password: "Haslo",
      passwordPlaceholder: "Wpisz haslo",
      signIn: "Zaloguj sie",
      signInLoading: "Logowanie...",
      enterLogin: "Wprowadz login",
      enterPassword: "Wprowadz haslo",
      selectSite: "Wybierz magazyn",
      loginError: "Blad logowania",
      systemError: "Blad systemu",
    },
    loaders: {
      protectedRoute: "Sprawdzam dostep i przygotowuje widok...",
      roleRoute: "Sprawdzam uprawnienia i konfiguracje widoku...",
    },
    roles: {
      user: "Operator",
      superuser: "Superuser",
      office: "Office",
      manager: "Manager",
      admin: "Administrator",
      missing: "Brak",
    },
  },
  en: {
    shell: {
      eyebrow: "Warehouse Flow",
      brand: "StockWise",
      themeLight: "Light",
      themeDark: "Dark",
      languageLabel: "Language",
      themeLabel: "Theme",
      back: "Back",
    },
    common: {
      warehouse: "Warehouse",
      loading: "Loading...",
      cancel: "Cancel",
      close: "Close",
      save: "Save",
    },
    menu: {
      greeting: "Hello, {{name}}",
      subtitle: "Choose your work area and jump straight into the module you need.",
      quickStart: "Quick start",
      logout: "Log out",
      logoutLoading: "Logging out...",
      workspace: "Your workspace",
      role: "Role",
      noAssignedWarehouse: "No warehouse assigned",
      process: "Process",
      history: "History",
      data: "Data",
      dashboard: "Statistics",
      settings: "Settings",
      processDesc: "Field operations, scanning and work sessions",
      historyDesc: "Inventory results and operation review",
      dataDesc: "References, imports and change history",
      dashboardDesc: "Metrics, pace of work and financial data",
      settingsDesc: "Admin panel, configuration and statuses",
      qrTitle: "Phone login QR",
      qrDescription:
        "Scan this code from any computer or monitor to quickly open the StockWise login screen on the operator phone.",
      loginLink: "Login link:",
      qrHint:
        "If the operator works on another device, just scan the QR code and log in normally.",
      quickStartTitle: "Quick start gap inventory",
      quickStartSubtitle:
        "Scan the nearest location and the system will choose the best direction to begin the check.",
      startLocation: "Starting location",
      startLocationHint:
        "It can be any location from the warehouse map near the area where the operator wants to begin.",
      scanLocation: "Location scan",
      locationPlaceholder: "e.g. A.01.001.D.3",
      runQuickStart: "Run quick start",
      scanLocationAria: "Open location scanner for quick start",
      scanModalTitle: "Scan starting location",
      scanModalDescription:
        "Scan the location code with the phone camera or upload a photo to start empty-location control immediately.",
      quickStartError: "Scan or enter the location where you want to begin.",
      quickStartInitError: "Could not start quick start.",
      sessionLogoutMessage: "Closing the session and logging the operator out of StockWise...",
    },
    auth: {
      brandSubtitle: "Warehouse operations, calmer, cleaner, clearer.",
      site: "Warehouse",
      chooseSite: "Choose warehouse",
      login: "Login",
      loginPlaceholder: "Enter login",
      password: "Password",
      passwordPlaceholder: "Enter password",
      signIn: "Sign in",
      signInLoading: "Signing in...",
      enterLogin: "Enter login",
      enterPassword: "Enter password",
      selectSite: "Choose warehouse",
      loginError: "Login failed",
      systemError: "System error",
    },
    loaders: {
      protectedRoute: "Checking access and preparing the view...",
      roleRoute: "Checking permissions and view configuration...",
    },
    roles: {
      user: "Operator",
      superuser: "Superuser",
      office: "Office",
      manager: "Manager",
      admin: "Administrator",
      missing: "Missing",
    },
  },
  de: {
    shell: {
      eyebrow: "Warehouse Flow",
      brand: "StockWise",
      themeLight: "Hell",
      themeDark: "Dunkel",
      languageLabel: "Sprache",
      themeLabel: "Modus",
      back: "Zuruck",
    },
    common: {
      warehouse: "Lager",
      loading: "Laden...",
      cancel: "Abbrechen",
      close: "Schliessen",
      save: "Speichern",
    },
    menu: {
      greeting: "Hallo, {{name}}",
      subtitle: "Wahle deinen Arbeitsbereich und gehe direkt in das passende Modul.",
      quickStart: "Schnellstart",
      logout: "Abmelden",
      logoutLoading: "Abmeldung...",
      workspace: "Dein Arbeitsbereich",
      role: "Rolle",
      noAssignedWarehouse: "Kein Lager zugewiesen",
      process: "Prozess",
      history: "Historie",
      data: "Daten",
      dashboard: "Statistiken",
      settings: "Einstellungen",
      processDesc: "Feldoperationen, Scannen und Arbeitssitzungen",
      historyDesc: "Inventurergebnisse und Vorgangsubersicht",
      dataDesc: "Stammdaten, Importe und Anderungshistorie",
      dashboardDesc: "Metriken, Arbeitstempo und Finanzdaten",
      settingsDesc: "Adminbereich, Konfiguration und Status",
      qrTitle: "QR fur Login am Telefon",
      qrDescription:
        "Scanne diesen Code von einem beliebigen Computer oder Monitor, um den StockWise-Login auf dem Operator-Handy schnell zu offnen.",
      loginLink: "Login-Link:",
      qrHint:
        "Wenn der Operator auf einem anderen Gerat arbeitet, reicht es, den QR-Code zu scannen und sich normal anzumelden.",
      quickStartTitle: "Schnellstart Gap Inventory",
      quickStartSubtitle:
        "Scanne die nachste Lokation und das System wählt die beste Richtung fur den Start der Kontrolle.",
      startLocation: "Startlokation",
      startLocationHint:
        "Das kann jede Lokation aus der Lagerkarte in der Nahe des Startbereichs des Operators sein.",
      scanLocation: "Lokationsscan",
      locationPlaceholder: "z. B. A.01.001.D.3",
      runQuickStart: "Schnellstart ausfuhren",
      scanLocationAria: "Lokationsscanner fur Schnellstart offnen",
      scanModalTitle: "Startlokation scannen",
      scanModalDescription:
        "Scanne den Lokationscode mit der Kamera oder lade ein Foto hoch, um die Kontrolle leerer Lokationen sofort zu starten.",
      quickStartError: "Scanne oder gib die Lokation ein, an der du beginnen willst.",
      quickStartInitError: "Schnellstart konnte nicht gestartet werden.",
      sessionLogoutMessage: "Sitzung wird beendet und der Operator wird aus StockWise abgemeldet...",
    },
    auth: {
      brandSubtitle: "Warehouse operations, calmer, cleaner, clearer.",
      site: "Lager",
      chooseSite: "Lager auswahlen",
      login: "Login",
      loginPlaceholder: "Login eingeben",
      password: "Passwort",
      passwordPlaceholder: "Passwort eingeben",
      signIn: "Anmelden",
      signInLoading: "Anmeldung...",
      enterLogin: "Login eingeben",
      enterPassword: "Passwort eingeben",
      selectSite: "Lager auswahlen",
      loginError: "Anmeldung fehlgeschlagen",
      systemError: "Systemfehler",
    },
    loaders: {
      protectedRoute: "Zugriff wird gepruft und Ansicht vorbereitet...",
      roleRoute: "Berechtigungen und Ansichts-Konfiguration werden gepruft...",
    },
    roles: {
      user: "Operator",
      superuser: "Superuser",
      office: "Office",
      manager: "Manager",
      admin: "Administrator",
      missing: "Fehlt",
    },
  },
};

const DEFAULT_LANGUAGE = "pl";
const DEFAULT_THEME = "light";
const LANGUAGES = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
];

const AppPreferencesContext = createContext(null);

function normalizeLanguage(value) {
  return LANGUAGES.some((item) => item.value === value) ? value : DEFAULT_LANGUAGE;
}

function normalizeTheme(value) {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

function readStoredPreference(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) || fallback;
}

function resolveTranslation(language, key) {
  const source = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
  return String(key || "")
    .split(".")
    .reduce((accumulator, segment) => (accumulator && accumulator[segment] !== undefined ? accumulator[segment] : null), source);
}

function interpolate(template, variables) {
  return String(template || "").replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const normalizedKey = String(key || "").trim();
    return variables?.[normalizedKey] ?? "";
  });
}

export function AppPreferencesProvider({ children }) {
  const [language, setLanguageState] = useState(() =>
    normalizeLanguage(readStoredPreference(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE))
  );
  const [theme, setThemeState] = useState(() =>
    normalizeTheme(readStoredPreference(THEME_STORAGE_KEY, DEFAULT_THEME))
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => {
    function t(key, variables = {}) {
      const direct = resolveTranslation(language, key);
      const fallback = resolveTranslation(DEFAULT_LANGUAGE, key);
      return interpolate(direct ?? fallback ?? key, variables);
    }

    return {
      language,
      setLanguage: (nextLanguage) => setLanguageState(normalizeLanguage(nextLanguage)),
      theme,
      setTheme: (nextTheme) => setThemeState(normalizeTheme(nextTheme)),
      toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
      t,
      languages: LANGUAGES,
    };
  }, [language, theme]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  }

  return context;
}
