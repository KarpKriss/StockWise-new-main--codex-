import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  ScanLine,
  Warehouse,
} from "lucide-react";
import { useAuth } from "../../core/auth/AppAuth";
import { useSession } from "../../core/session/AppSession";
import {
  confirmEmptyLocation,
  fetchEmptyLocationAisles,
  fetchEmptyLocationsForZone,
  fetchEmptyLocationTypes,
  fetchEmptyLocationZones,
  fetchQuickStartAnchorLocation,
  markLocationOnWork,
  releaseLocationWork,
  resolveProductForSurplus,
  reportLocationProblem,
  reportLocationSurplus,
} from "../../core/api/emptyLocationsApi";
import PageShell from "../../components/layout/PageShell";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import Button from "../../components/ui/Button";
import BarcodeScannerModal from "../../components/scanner/BarcodeScannerModal";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import EanStepModern from "./steps/EanStepModern";
import SkuStepModern from "./steps/SkuStepModern";
import LotStepModern from "./steps/LotStepModern";
import QuantityStepModern from "./steps/QuantityStepModern";
import { DEFAULT_MANUAL_PROCESS_CONFIG } from "../../core/config/manualProcessConfig";
import { fetchManualProcessConfig } from "../../core/api/manualProcessApi";

function SummaryCard({ zone, locationType, aisle, progress, location, copy }) {
  return (
    <div className="process-summary-card">
      <div className="process-summary-item">
        <div className="process-summary-item__label">{copy.zoneLabel}</div>
        <div className="process-summary-item__value">{zone || "-"}</div>
      </div>
      <div className="process-summary-item">
        <div className="process-summary-item__label">{copy.locationTypeLabel}</div>
        <div className="process-summary-item__value">{locationType || "-"}</div>
      </div>
      <div className="process-summary-item">
        <div className="process-summary-item__label">{copy.aisleLabel}</div>
        <div className="process-summary-item__value">{aisle || "-"}</div>
      </div>
      <div className="process-summary-item">
        <div className="process-summary-item__label">{copy.progressLabel}</div>
        <div className="process-summary-item__value">{progress}</div>
      </div>
      <div className="process-summary-item">
        <div className="process-summary-item__label">{copy.currentLocationLabel}</div>
        <div className="process-summary-item__value">{location || "-"}</div>
      </div>
    </div>
  );
}

function buildScopeKey(zone, locationType, aisle) {
  return [zone || "", locationType || "", aisle || ""].join("::");
}

function reorderLocationsFromAnchor(locations, anchorCode) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return {
      locations: [],
      directionKey: "none",
      startedFromExactMatch: false,
    };
  }

  const normalizedAnchor = String(anchorCode || "").trim().toLowerCase();
  const exactIndex = locations.findIndex(
    (row) => String(row.code || "").trim().toLowerCase() === normalizedAnchor
  );

  let pivotIndex = exactIndex;
  let startedFromExactMatch = exactIndex >= 0;

  if (pivotIndex < 0) {
    pivotIndex = locations.findIndex(
      (row) => String(row.code || "").trim().toLowerCase() > normalizedAnchor
    );

    if (pivotIndex < 0) {
      pivotIndex = locations.length - 1;
    }
  }

  const beforeCount = pivotIndex;
  const afterCount = locations.length - pivotIndex - 1;
  const preferForward = afterCount >= beforeCount;

  if (preferForward) {
    return {
      locations: [...locations.slice(pivotIndex), ...locations.slice(0, pivotIndex)],
      directionKey: "forward",
      startedFromExactMatch,
    };
  }

  const beforeSide = locations.slice(0, pivotIndex + 1).reverse();
  const afterSide = locations.slice(pivotIndex + 1).reverse();

  return {
    locations: [...beforeSide, ...afterSide],
    directionKey: "backward",
    startedFromExactMatch,
  };
}

export default function EmptyLocationProcessModern() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const { session, isActive, addOperation, endSession } = useSession();
  const [zones, setZones] = useState([]);
  const [completedScopes, setCompletedScopes] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState("");
  const [selectedAisle, setSelectedAisle] = useState("");
  const [locationTypes, setLocationTypes] = useState([]);
  const [aisles, setAisles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState("zones");
  const [scanValue, setScanValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [surplusData, setSurplusData] = useState({
    ean: "",
    sku: "",
    lot: "",
    quantity: "",
  });
  const [problemNote, setProblemNote] = useState("");
  const [decisionScanValue, setDecisionScanValue] = useState("");
  const [quickStartInfo, setQuickStartInfo] = useState(null);
  const [scannerConfig, setScannerConfig] = useState(DEFAULT_MANUAL_PROCESS_CONFIG.scanning);
  const [scannerModal, setScannerModal] = useState({
    open: false,
    fieldKey: null,
    title: "",
  });
  const lockedLocationIdRef = useRef(null);
  const quickStartAttemptedRef = useRef(false);
  const scanInputRef = useRef(null);
  const decisionInputRef = useRef(null);

  const currentLocation = queue[currentIndex] || null;
  const copy = useMemo(
    () =>
      ({
        pl: {
          problemOptions: [
            { value: "Towar uszkodzony", title: "Towar uszkodzony", description: "Zglos uszkodzenie produktu lub opakowania." },
            { value: "Problem z iloscia towaru", title: "Problem z iloscia", description: "Towar jest obecny, ale ilosc budzi watpliwosci." },
            { value: "Brak identyfikacji towaru", title: "Brak identyfikacji", description: "Nie da sie jednoznacznie rozpoznac produktu." },
          ],
          zoneLabel: "Strefa",
          locationTypeLabel: "Typ lokalizacji",
          aisleLabel: "Aleja",
          progressLabel: "Postep",
          currentLocationLabel: "Aktualna lokalizacja",
          loadZonesError: "Blad pobierania stref",
          quickStartError: "Nie udalo sie uruchomic szybkiego startu.",
          beginZoneError: "Nie udalo sie uruchomic strefy",
          closeProcessError: "Nie udalo sie zamknac procesu.",
          scanLocationFirst: "Najpierw zeskanuj albo wpisz lokalizacje.",
          scanMismatch: "Skan nie zgadza sie z aktualna lokalizacja.",
          quickConfirmScan: "Zeskanuj albo wpisz aktualna lokalizacje, aby szybko potwierdzic pusty adres.",
          confirmEmptyError: "Nie udalo sie potwierdzic pustej lokalizacji.",
          saveProblemError: "Nie udalo sie zapisac problemu.",
          missingSkuOrEan: "Podaj SKU albo EAN.",
          invalidQuantity: "Ilosc musi byc wieksza od zera.",
          unknownProduct: "Nie znaleziono SKU lub EAN w kartotece produktow.",
          saveSurplusError: "Nie udalo sie zapisac nadwyzki.",
          noSessionTitle: "Brak aktywnej sesji",
          noSessionSubtitle: "Uruchom proces z menu, aby rozpoczac kontrole pustych lokalizacji.",
          title: "Inwentaryzacja pustych lokalizacji",
          subtitle: "Sprawdzaj lokalizacje jedna po drugiej, potwierdzaj puste miejsca i raportuj wyjatki bez opuszczania flow.",
          backLabel: "Powrot do wyboru procesu",
          quickStartActive: "Szybki start aktywny",
          quickStartText:
            "Start od lokalizacji {{location}} w strefie {{zone}}, typie {{type}} i alei {{aisle}}. Kolejnosc zostala ustawiona {{direction}}.",
          directionForward: "w strone konca alei",
          directionBackward: "w strone poczatku alei",
          directionNone: "bez aktywnych pozycji",
          loadingZones: "Ladowanie stref...",
          chooseZone: "Wybierz strefe startowa",
          chooseZoneDesc: "Strefy sa pokazywane jako wygodne kafle, a po ukonczeniu znikaja z listy.",
          chooseType: "Wybierz typ lokalizacji",
          chooseTypeDesc: "Po wyborze strefy zawezamy proces do jednego typu lokalizacji, aby operator pracowal spojnym zakresem.",
          chooseAisle: "Wybierz aleje startowa",
          chooseAisleDesc: "Aleje sa liczone tylko dla wybranej strefy i typu lokalizacji.",
          noTypes: "Brak typow lokalizacji z gotowymi pozycjami do sprawdzenia w tej strefie.",
          noAisles: "Brak alei z gotowymi pozycjami do sprawdzenia dla tego typu lokalizacji.",
          noZones: "Brak kolejnych stref z aktywnymi lokalizacjami do sprawdzenia.",
          finishAndBack: "Zakoncz i wroc do wyboru procesu",
          confirmLocationTitle: "Potwierdz lokalizacje",
          confirmLocationDesc: "Zeskanuj kod lub wpisz go recznie, aby przejsc dalej.",
          scanLocation: "Skanuj lokalizacje",
          openLocationScanner: "Otworz skaner lokalizacji",
          locationPlaceholder: "Zeskanuj lub wpisz kod lokalizacji",
          confirmScan: "Potwierdz skan",
          emptyQuestion: "Czy lokalizacja jest pusta?",
          emptyQuestionDesc: "Wybierz dalszy krok dla aktualnej lokalizacji w strefie {{zone}}.",
          quickConfirm: "Szybkie potwierdzenie skanem",
          quickConfirmPlaceholder: "Zeskanuj aktualna lokalizacje i zatwierdz Enterem",
          openDecisionScanner: "Otworz skaner potwierdzenia lokalizacji",
          yesEmpty: "Tak, jest pusta",
          yesEmptyDesc: "Zapisz lokalizacje jako sprawdzona i przejdz do kolejnej.",
          addGoods: "Dodaj towar",
          addGoodsDesc: "Zarejestruj znaleziona nadwyzke z poziomu tej lokalizacji.",
          reportProblem: "Zglos problem",
          reportProblemDesc: "Dodaj problem operacyjny lub identyfikacyjny bez przerywania pracy.",
          issueTitle: "Wybierz typ problemu",
          issueDesc: "Opis zostanie zapisany razem z lokalizacja i aktualnym operatorem.",
          issueNotePlaceholder: "Opcjonalny komentarz do problemu",
          back: "Wroc",
          surplusTitle: "Dodaj towar dla {{location}}",
          surplusDesc: "Uzupelnij dane produktu i zapisz nadwyzke bez opuszczania procesu.",
          scanEan: "Skanuj EAN produktu",
          scanSku: "Skanuj SKU produktu",
          scanLot: "Skanuj numer LOT",
          saveGoods: "Zapisz towar",
          zoneFinished: "Aleja zakonczona",
          zoneFinishedDesc: "Ta aleja zostala juz obsluzona. Mozesz przejsc do kolejnej alei w tym samym typie albo wrocic do wyboru zakresu.",
          checkedLocations: "Sprawdzone lokalizacje",
          startNextZone: "Wroc do wyboru strefy",
          startNextAisle: "Rozpocznij nastepna aleje",
          chooseAnotherAisle: "Wybierz inna aleje",
          chooseAnotherType: "Zmien typ lokalizacji",
          scannerDescription: "Skieruj aparat na kod albo wgraj zdjecie. Odczyt trafia bezposrednio do aktualnego pola procesu pustych lokalizacji.",
          overlay: "Przetwarzam lokalizacje i zapisuje postep kontroli...",
        },
        en: {
          problemOptions: [
            { value: "Damaged goods", title: "Damaged goods", description: "Report damaged product or packaging." },
            { value: "Quantity issue", title: "Quantity issue", description: "The product is present, but the quantity is questionable." },
            { value: "Product cannot be identified", title: "No identification", description: "The product cannot be identified unambiguously." },
          ],
          zoneLabel: "Zone",
          locationTypeLabel: "Location type",
          aisleLabel: "Aisle",
          progressLabel: "Progress",
          currentLocationLabel: "Current location",
          loadZonesError: "Could not load zones",
          quickStartError: "Could not start quick start.",
          beginZoneError: "Could not start the zone",
          closeProcessError: "Could not close the process.",
          scanLocationFirst: "Scan or enter the location first.",
          scanMismatch: "The scan does not match the current location.",
          quickConfirmScan: "Scan or enter the current location to confirm the empty address quickly.",
          confirmEmptyError: "Could not confirm the empty location.",
          saveProblemError: "Could not save the issue.",
          missingSkuOrEan: "Enter SKU or EAN.",
          invalidQuantity: "Quantity must be greater than zero.",
          unknownProduct: "SKU or EAN could not be found in the product catalog.",
          saveSurplusError: "Could not save the surplus.",
          noSessionTitle: "No active session",
          noSessionSubtitle: "Start the process from the menu to begin checking empty locations.",
          title: "Empty location inventory",
          subtitle: "Check locations one by one, confirm empty spaces and report exceptions without leaving the flow.",
          backLabel: "Back to process selection",
          quickStartActive: "Quick start active",
          quickStartText:
            "Started from location {{location}} in zone {{zone}}, type {{type}} and aisle {{aisle}}. The order was set {{direction}}.",
          directionForward: "towards the end of the aisle",
          directionBackward: "towards the beginning of the aisle",
          directionNone: "with no active positions",
          loadingZones: "Loading zones...",
          chooseZone: "Choose starting zone",
          chooseZoneDesc: "Zones are shown as convenient tiles and disappear from the list once completed.",
          chooseType: "Choose location type",
          chooseTypeDesc: "After selecting the zone, we narrow the process to one location type so the operator stays in a consistent scope.",
          chooseAisle: "Choose starting aisle",
          chooseAisleDesc: "Aisles are calculated only for the selected zone and location type.",
          noTypes: "There are no location types with ready positions to check in this zone.",
          noAisles: "There are no aisles with ready positions to check for this location type.",
          noZones: "There are no more zones with active locations to check.",
          finishAndBack: "Finish and return to process selection",
          confirmLocationTitle: "Confirm location",
          confirmLocationDesc: "Scan the code or enter it manually to continue.",
          scanLocation: "Scan location",
          openLocationScanner: "Open location scanner",
          locationPlaceholder: "Scan or enter location code",
          confirmScan: "Confirm scan",
          emptyQuestion: "Is the location empty?",
          emptyQuestionDesc: "Choose the next step for the current location in zone {{zone}}.",
          quickConfirm: "Quick confirmation by scan",
          quickConfirmPlaceholder: "Scan the current location and confirm with Enter",
          openDecisionScanner: "Open location confirmation scanner",
          yesEmpty: "Yes, it is empty",
          yesEmptyDesc: "Save the location as checked and move to the next one.",
          addGoods: "Add goods",
          addGoodsDesc: "Register the found surplus from this location.",
          reportProblem: "Report issue",
          reportProblemDesc: "Add an operational or identification issue without breaking the flow.",
          issueTitle: "Choose issue type",
          issueDesc: "The description will be saved together with the location and current operator.",
          issueNotePlaceholder: "Optional issue note",
          back: "Back",
          surplusTitle: "Add goods for {{location}}",
          surplusDesc: "Fill in product data and save the surplus without leaving the process.",
          scanEan: "Scan product EAN",
          scanSku: "Scan product SKU",
          scanLot: "Scan LOT number",
          saveGoods: "Save goods",
          zoneFinished: "Aisle completed",
          zoneFinishedDesc: "This aisle has already been handled. You can move to the next aisle in the same location type or return to scope selection.",
          checkedLocations: "Checked locations",
          startNextZone: "Back to zone selection",
          startNextAisle: "Start next aisle",
          chooseAnotherAisle: "Choose another aisle",
          chooseAnotherType: "Change location type",
          scannerDescription: "Point the camera at the code or upload a photo. The result goes directly into the current empty-location process field.",
          overlay: "Processing locations and saving control progress...",
        },
        de: {
          problemOptions: [
            { value: "Beschadigte Ware", title: "Beschadigte Ware", description: "Beschadigtes Produkt oder Verpackung melden." },
            { value: "Mengenproblem", title: "Mengenproblem", description: "Die Ware ist vorhanden, aber die Menge ist fraglich." },
            { value: "Produkt nicht identifizierbar", title: "Keine Identifikation", description: "Das Produkt kann nicht eindeutig erkannt werden." },
          ],
          zoneLabel: "Zone",
          locationTypeLabel: "Lokationstyp",
          aisleLabel: "Gang",
          progressLabel: "Fortschritt",
          currentLocationLabel: "Aktuelle Lokation",
          loadZonesError: "Zonen konnten nicht geladen werden",
          quickStartError: "Schnellstart konnte nicht gestartet werden.",
          beginZoneError: "Zone konnte nicht gestartet werden",
          closeProcessError: "Der Prozess konnte nicht beendet werden.",
          scanLocationFirst: "Scanne oder gib zuerst die Lokation ein.",
          scanMismatch: "Der Scan stimmt nicht mit der aktuellen Lokation uberein.",
          quickConfirmScan: "Scanne oder gib die aktuelle Lokation ein, um die leere Adresse schnell zu bestaetigen.",
          confirmEmptyError: "Leere Lokation konnte nicht bestaetigt werden.",
          saveProblemError: "Problem konnte nicht gespeichert werden.",
          missingSkuOrEan: "SKU oder EAN eingeben.",
          invalidQuantity: "Menge muss groesser als null sein.",
          unknownProduct: "SKU oder EAN wurde im Produktkatalog nicht gefunden.",
          saveSurplusError: "Mehrmenge konnte nicht gespeichert werden.",
          noSessionTitle: "Keine aktive Sitzung",
          noSessionSubtitle: "Starte den Prozess aus dem Menu, um die Kontrolle leerer Lokationen zu beginnen.",
          title: "Inventur leerer Lokationen",
          subtitle: "Prufe Lokationen nacheinander, bestaetige leere Plaetze und melde Ausnahmen, ohne den Flow zu verlassen.",
          backLabel: "Zuruck zur Prozessauswahl",
          quickStartActive: "Schnellstart aktiv",
          quickStartText:
            "Start an Lokation {{location}} in Zone {{zone}}, Typ {{type}} und Gang {{aisle}}. Die Reihenfolge wurde {{direction}} gesetzt.",
          directionForward: "in Richtung Gangende",
          directionBackward: "in Richtung Ganganfang",
          directionNone: "ohne aktive Positionen",
          loadingZones: "Zonen werden geladen...",
          chooseZone: "Startzone wahlen",
          chooseZoneDesc: "Zonen werden als praktische Kacheln angezeigt und verschwinden nach Abschluss aus der Liste.",
          chooseType: "Lokationstyp wahlen",
          chooseTypeDesc: "Nach der Zonenauswahl begrenzen wir den Prozess auf einen Lokationstyp, damit der Operator in einem klaren Bereich arbeitet.",
          chooseAisle: "Startgang wahlen",
          chooseAisleDesc: "Gange werden nur fur die ausgewahlte Zone und den ausgewahlten Lokationstyp berechnet.",
          noTypes: "In dieser Zone gibt es keine Lokationstypen mit prufbereiten Positionen.",
          noAisles: "Fur diesen Lokationstyp gibt es keine Gange mit prufbereiten Positionen.",
          noZones: "Es gibt keine weiteren Zonen mit aktiven Lokationen zur Prufung.",
          finishAndBack: "Beenden und zur Prozessauswahl zuruck",
          confirmLocationTitle: "Lokation bestaetigen",
          confirmLocationDesc: "Scanne den Code oder gib ihn manuell ein, um fortzufahren.",
          scanLocation: "Lokation scannen",
          openLocationScanner: "Lokationsscanner offnen",
          locationPlaceholder: "Lokationscode scannen oder eingeben",
          confirmScan: "Scan bestaetigen",
          emptyQuestion: "Ist die Lokation leer?",
          emptyQuestionDesc: "Waehle den naechsten Schritt fur die aktuelle Lokation in Zone {{zone}}.",
          quickConfirm: "Schnellbestaetigung per Scan",
          quickConfirmPlaceholder: "Aktuelle Lokation scannen und mit Enter bestaetigen",
          openDecisionScanner: "Scanner fur Lokationsbestaetigung offnen",
          yesEmpty: "Ja, sie ist leer",
          yesEmptyDesc: "Lokation als gepruft speichern und zur naechsten wechseln.",
          addGoods: "Ware hinzufugen",
          addGoodsDesc: "Gefundene Mehrmenge direkt aus dieser Lokation erfassen.",
          reportProblem: "Problem melden",
          reportProblemDesc: "Operatives oder Identifikationsproblem melden, ohne den Flow zu unterbrechen.",
          issueTitle: "Problemtyp waehlen",
          issueDesc: "Die Beschreibung wird zusammen mit Lokation und aktuellem Operator gespeichert.",
          issueNotePlaceholder: "Optionaler Kommentar zum Problem",
          back: "Zuruck",
          surplusTitle: "Ware fur {{location}} hinzufugen",
          surplusDesc: "Produktdaten ergaenzen und Mehrmenge speichern, ohne den Prozess zu verlassen.",
          scanEan: "Produkt-EAN scannen",
          scanSku: "Produkt-SKU scannen",
          scanLot: "LOT-Nummer scannen",
          saveGoods: "Ware speichern",
          zoneFinished: "Gang abgeschlossen",
          zoneFinishedDesc: "Dieser Gang wurde bereits bearbeitet. Du kannst zum nachsten Gang im selben Lokationstyp wechseln oder zur Bereichsauswahl zuruckkehren.",
          checkedLocations: "Geprufte Lokationen",
          startNextZone: "Zur Zonenauswahl zuruck",
          startNextAisle: "Naechsten Gang starten",
          chooseAnotherAisle: "Anderen Gang wahlen",
          chooseAnotherType: "Lokationstyp wechseln",
          scannerDescription: "Richte die Kamera auf den Code oder lade ein Foto hoch. Das Ergebnis wird direkt in das aktuelle Feld des Leerplatz-Prozesses geschrieben.",
          overlay: "Lokationen werden verarbeitet und der Kontrollfortschritt gespeichert...",
        },
      })[language],
    [language],
  );
  const totalLocations = totalCount || queue.length;
  const availableZones = useMemo(() => zones, [zones]);
  const availableTypes = useMemo(() => locationTypes, [locationTypes]);
  const availableAisles = useMemo(
    () =>
      aisles.filter(
        (aisle) => !completedScopes.includes(buildScopeKey(selectedZone, selectedLocationType, aisle))
      ),
    [aisles, completedScopes, selectedLocationType, selectedZone]
  );
  const nextAisle = useMemo(
    () => availableAisles.find((aisle) => aisle !== selectedAisle) || null,
    [availableAisles, selectedAisle]
  );

  useEffect(() => {
    if (!user?.site_id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadZones() {
      try {
        setLoading(true);
        const [zonesResult, configResult] = await Promise.allSettled([
          fetchEmptyLocationZones({ siteId: user.site_id }),
          fetchManualProcessConfig(user.site_id),
        ]);

        if (zonesResult.status === "rejected") {
          throw zonesResult.reason;
        }

        if (!cancelled) {
          setZones(zonesResult.value);
          setScannerConfig(
            configResult.status === "fulfilled"
              ? configResult.value?.scanning || DEFAULT_MANUAL_PROCESS_CONFIG.scanning
              : DEFAULT_MANUAL_PROCESS_CONFIG.scanning
          );
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || copy.loadZonesError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadZones();

    return () => {
      cancelled = true;
    };
  }, [copy.loadZonesError, user?.site_id]);

  useEffect(() => {
    const quickStartCode = routerLocation.state?.quickStartCode;
    const quickStartMode = routerLocation.state?.quickStartMode;

    if (!quickStartMode || !quickStartCode || !user?.site_id || quickStartAttemptedRef.current) {
      return;
    }

    quickStartAttemptedRef.current = true;

    async function startFromAnchor() {
      try {
        setSubmitting(true);
        setError("");

        const anchorLocation = await fetchQuickStartAnchorLocation({
          code: quickStartCode,
          siteId: user.site_id,
        });

        if (!anchorLocation.zone || !anchorLocation.location_type || !anchorLocation.aisle) {
          throw new Error(copy.quickStartError);
        }

        const types = await fetchEmptyLocationTypes({
          zone: anchorLocation.zone,
          siteId: user.site_id,
        });
        setLocationTypes(types);

        const nextAisles = await fetchEmptyLocationAisles({
          zone: anchorLocation.zone,
          locationType: anchorLocation.location_type,
          siteId: user.site_id,
        });
        setAisles(nextAisles);

        await beginScope({
          zone: anchorLocation.zone,
          locationType: anchorLocation.location_type,
          aisle: anchorLocation.aisle,
          anchorCode: anchorLocation.code,
          quickStart: true,
        });
      } catch (err) {
        setError(err.message || copy.quickStartError);
      } finally {
        setSubmitting(false);
      }
    }

    startFromAnchor();
  }, [copy.quickStartError, routerLocation.state, user?.site_id]);

  useEffect(() => {
    return () => {
      if (lockedLocationIdRef.current) {
        releaseLocationWork({ locationId: lockedLocationIdRef.current }).catch((releaseError) => {
          console.error("EMPTY PROCESS CLEANUP RELEASE ERROR:", releaseError);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (stage !== "scan") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      scanInputRef.current?.focus();
      scanInputRef.current?.select?.();
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [stage, currentLocation?.id]);

  function getScanFieldConfig(fieldKey) {
    return scannerConfig.fields?.[fieldKey] || DEFAULT_MANUAL_PROCESS_CONFIG.scanning.fields[fieldKey];
  }

  function isScannerEnabledForField(fieldKey) {
    return Boolean(scannerConfig.enabled && getScanFieldConfig(fieldKey)?.enabled);
  }

  function openScanner(fieldKey, title) {
    if (!isScannerEnabledForField(fieldKey)) {
      return;
    }

    setScannerModal({
      open: true,
      fieldKey,
      title,
    });
    setError("");
  }

  function closeScanner() {
    setScannerModal({
      open: false,
      fieldKey: null,
      title: "",
    });
  }

  function handleScannerDetected(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue || !scannerModal.fieldKey) {
      return;
    }

    switch (scannerModal.fieldKey) {
      case "location":
        setScanValue(normalizedValue);
        break;
      case "decision-location":
        setDecisionScanValue(normalizedValue);
        break;
      case "surplus-ean":
        setSurplusData((current) => ({ ...current, ean: normalizedValue }));
        break;
      case "surplus-sku":
        setSurplusData((current) => ({ ...current, sku: normalizedValue }));
        break;
      case "surplus-lot":
        setSurplusData((current) => ({ ...current, lot: normalizedValue }));
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (stage !== "decision") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      decisionInputRef.current?.focus();
      decisionInputRef.current?.select?.();
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [stage, currentLocation?.id]);

  async function activateLocation(location) {
    if (!location?.id || !user?.id) {
      return;
    }

    await markLocationOnWork({
      locationId: location.id,
      userId: user.id,
    });

    lockedLocationIdRef.current = location.id;
  }

  async function loadTypesForZone(zone) {
    try {
      setSubmitting(true);
      const types = await fetchEmptyLocationTypes({
        zone,
        siteId: user?.site_id,
      });

      setSelectedZone(zone);
      setSelectedLocationType("");
      setSelectedAisle("");
      setLocationTypes(types);
      setAisles([]);
      setQueue([]);
      setTotalCount(0);
      setCurrentIndex(0);
      setQuickStartInfo(null);
      setScanValue("");
      setDecisionScanValue("");
      setProblemNote("");
      setError(types.length === 0 ? copy.noTypes : "");
      setStage(types.length === 0 ? "zones" : "types");
    } catch (err) {
      setError(err.message || copy.beginZoneError);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadAislesForSelection(zone, locationType) {
    try {
      setSubmitting(true);
      const nextAisles = await fetchEmptyLocationAisles({
        zone,
        locationType,
        siteId: user?.site_id,
      });

      setSelectedZone(zone);
      setSelectedLocationType(locationType);
      setSelectedAisle("");
      setAisles(nextAisles);
      setQueue([]);
      setTotalCount(0);
      setCurrentIndex(0);
      setScanValue("");
      setDecisionScanValue("");
      setProblemNote("");
      setError(nextAisles.length === 0 ? copy.noAisles : "");
      setStage(nextAisles.length === 0 ? "types" : "aisles");
    } catch (err) {
      setError(err.message || copy.beginZoneError);
    } finally {
      setSubmitting(false);
    }
  }

  async function beginScope({ zone, locationType, aisle, anchorCode = null, quickStart = false }) {
    try {
      setSubmitting(true);
      const result = await fetchEmptyLocationsForZone({
        zone,
        locationType,
        aisle,
        siteId: user?.site_id,
      });
      const locations = result.locations || [];
      const orderedResult = anchorCode ? reorderLocationsFromAnchor(locations, anchorCode) : null;
      const orderedLocations = orderedResult?.locations || locations;

      setSelectedZone(zone);
      setSelectedLocationType(locationType);
      setSelectedAisle(aisle);
      setQueue(orderedLocations);
      setTotalCount(result.totalCount || orderedLocations.length);
      setCurrentIndex(0);
      setScanValue("");
      setDecisionScanValue("");
      setProblemNote("");
      setError("");
      setQuickStartInfo(
        quickStart
              ? {
                  anchorCode,
                  zone,
                  locationType,
                  aisle,
                  directionLabel:
                    orderedResult?.directionKey === "backward"
                      ? copy.directionBackward
                      : orderedResult?.directionKey === "none"
                        ? copy.directionNone
                        : copy.directionForward,
                  startedFromExactMatch: orderedResult?.startedFromExactMatch || false,
                }
          : null
      );

      if (orderedLocations.length === 0) {
        setCompletedScopes((current) =>
          current.includes(buildScopeKey(zone, locationType, aisle))
            ? current
            : [...current, buildScopeKey(zone, locationType, aisle)]
        );
        setStage("scope-finished");
        return;
      }

      await activateLocation(orderedLocations[0]);
      setStage("scan");
    } catch (err) {
      setError(err.message || copy.beginZoneError);
    } finally {
      setSubmitting(false);
    }
  }

  async function moveToNextLocation() {
    const nextIndex = currentIndex + 1;

    setScanValue("");
    setDecisionScanValue("");
    setSurplusData({ ean: "", sku: "", lot: "", quantity: "" });
    setProblemNote("");

    if (nextIndex >= totalLocations) {
      setCompletedScopes((current) =>
        current.includes(buildScopeKey(selectedZone, selectedLocationType, selectedAisle))
          ? current
          : [...current, buildScopeKey(selectedZone, selectedLocationType, selectedAisle)]
      );
      setStage("scope-finished");
      return;
    }

    const nextLocation = queue[nextIndex];
    await activateLocation(nextLocation);
    setCurrentIndex(nextIndex);
    setStage("scan");
  }

  function resetToZonePicker() {
    setSelectedZone("");
    setSelectedLocationType("");
    setSelectedAisle("");
    setLocationTypes([]);
    setAisles([]);
    setQueue([]);
    setTotalCount(0);
    setCurrentIndex(0);
    setQuickStartInfo(null);
    setScanValue("");
    setDecisionScanValue("");
    setProblemNote("");
    setError("");
    setStage("zones");
  }

  async function handleExitProcess() {
    try {
      setSubmitting(true);
      setError("");

      if (lockedLocationIdRef.current) {
        await releaseLocationWork({ locationId: lockedLocationIdRef.current });
        lockedLocationIdRef.current = null;
      }

      await endSession();
      navigate("/process");
    } catch (err) {
      setError(err.message || copy.closeProcessError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScanConfirm() {
    if (!currentLocation) {
      return;
    }

    const normalizedInput = scanValue.trim().toLowerCase();
    const normalizedLocation = String(currentLocation.code || "").trim().toLowerCase();

    if (!normalizedInput) {
      setError(copy.scanLocationFirst);
      return;
    }

    if (normalizedInput !== normalizedLocation) {
      setError(copy.scanMismatch);
      return;
    }

    setError("");
    setDecisionScanValue("");
    setStage("decision");
  }

  async function handleDecisionScanConfirm() {
    if (!currentLocation) {
      return;
    }

    const normalizedInput = decisionScanValue.trim().toLowerCase();
    const normalizedLocation = String(currentLocation.code || "").trim().toLowerCase();

    if (!normalizedInput) {
      setError(copy.quickConfirmScan);
      return;
    }

    if (normalizedInput !== normalizedLocation) {
      setError(copy.scanMismatch);
      return;
    }

    setError("");
    await handleConfirmEmpty();
  }

  async function handleConfirmEmpty() {
    if (!currentLocation || !session?.session_id) {
      return;
    }

    try {
      setSubmitting(true);
      await confirmEmptyLocation({
        location: currentLocation,
        user,
        sessionId: session.session_id,
        zone: selectedZone,
      });

      lockedLocationIdRef.current = null;
      addOperation({
        location: currentLocation.code,
        zone: selectedZone,
        type: "pusta_lokalizacja",
        quantity: 0,
      });
      await moveToNextLocation();
    } catch (err) {
      setError(err.message || copy.confirmEmptyError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProblemReport(reason) {
    if (!currentLocation || !session?.session_id) {
      return;
    }

    try {
      setSubmitting(true);
      await reportLocationProblem({
        location: currentLocation,
        user,
        sessionId: session.session_id,
        zone: selectedZone,
        reason,
        note: problemNote.trim() || null,
      });

      lockedLocationIdRef.current = null;
      addOperation({
        location: currentLocation.code,
        zone: selectedZone,
        type: "problem",
        quantity: 0,
        reason,
      });
      await moveToNextLocation();
    } catch (err) {
      setError(err.message || copy.saveProblemError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSurplusSubmit() {
    if (!currentLocation || !session?.session_id || !user?.id) {
      return;
    }

    const quantity = Number(surplusData.quantity);

    if (!surplusData.sku.trim() && !surplusData.ean.trim()) {
      setError(copy.missingSkuOrEan);
      return;
    }

    if (!quantity || quantity <= 0) {
      setError(copy.invalidQuantity);
      return;
    }

    try {
      setSubmitting(true);

      const resolvedProduct = await resolveProductForSurplus({
        sku: surplusData.sku.trim(),
        ean: surplusData.ean || null,
        siteId: user?.site_id,
      });

      if (!resolvedProduct) {
        throw new Error(copy.unknownProduct);
      }

      const normalizedPayload = {
        ean: surplusData.ean || resolvedProduct.matched_barcode || resolvedProduct.ean || null,
        sku: resolvedProduct.sku,
        lot: surplusData.lot || null,
        quantity,
      };

      await reportLocationSurplus({
        location: currentLocation,
        user,
        sessionId: session.session_id,
        zone: selectedZone,
        ean: normalizedPayload.ean,
        sku: normalizedPayload.sku,
        lot: normalizedPayload.lot,
        quantity: normalizedPayload.quantity,
      });

      lockedLocationIdRef.current = null;
      addOperation({
        session_id: session.session_id,
        operator: user.email,
        site_id: user.site_id,
        user_id: user.id,
        operation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        location: currentLocation.code,
        type: "surplus",
        ...normalizedPayload,
      });

      await moveToNextLocation();
    } catch (err) {
      setError(err.message || copy.saveSurplusError);
    } finally {
      setSubmitting(false);
    }
  }

  if (!session?.session_id || !isActive) {
    return (
      <PageShell
        compact
        title={copy.noSessionTitle}
        subtitle={copy.noSessionSubtitle}
        icon={<Warehouse size={26} />}
        backTo="/menu"
      >
        <div className="app-card">
          <Button onClick={() => navigate("/menu")} size="lg">
            {copy.back}
          </Button>
        </div>
      </PageShell>
    );
  }

  const progress = totalLocations ? `${Math.min(currentIndex + 1, totalLocations)}/${totalLocations}` : "-";

  return (
    <PageShell
      compact
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<Warehouse size={26} />}
      backTo="/process"
      onBack={handleExitProcess}
      backLabel={copy.backLabel}
    >
      <div className="process-layout">
        {quickStartInfo ? (
          <div className="app-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <ArrowRight size={22} />
              </div>
              <div className="process-stage-header__text">
                <h2>{copy.quickStartActive}</h2>
                <p>
                  {copy.quickStartText
                    .replace("{{location}}", quickStartInfo.anchorCode)
                    .replace("{{zone}}", quickStartInfo.zone)
                    .replace("{{type}}", quickStartInfo.locationType || "-")
                    .replace("{{aisle}}", quickStartInfo.aisle || "-")
                    .replace("{{direction}}", quickStartInfo.directionLabel)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {selectedZone ? (
          <SummaryCard
            zone={selectedZone}
            locationType={selectedLocationType}
            aisle={selectedAisle}
            progress={progress}
            location={currentLocation?.code}
            copy={copy}
          />
        ) : null}

        {error ? <div className="input-error-text">{error}</div> : null}

        {loading ? (
          <div className="app-card">{copy.loadingZones}</div>
        ) : null}

        {!loading && stage === "zones" ? (
          <div className="app-card process-panel">
            <div>
              <h2 className="process-panel__title">{copy.chooseZone}</h2>
              <p className="process-panel__subtitle">
                {copy.chooseZoneDesc}
              </p>
            </div>

            {availableZones.length === 0 ? (
              <div className="app-empty-state">
                {copy.noZones}
              </div>
            ) : (
              <div className="process-zone-grid">
                {availableZones.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    className="card selectable process-zone-card"
                    disabled={submitting}
                    onClick={() => loadTypesForZone(zone)}
                  >
                    <div className="process-zone-card__value">{zone}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="process-actions">
              <Button variant="secondary" size="lg" loading={submitting} onClick={handleExitProcess}>
                {copy.finishAndBack}
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && stage === "types" ? (
          <div className="app-card process-panel">
            <div>
              <h2 className="process-panel__title">{copy.chooseType}</h2>
              <p className="process-panel__subtitle">{copy.chooseTypeDesc}</p>
            </div>

            {availableTypes.length === 0 ? (
              <div className="app-empty-state">{copy.noTypes}</div>
            ) : (
              <div className="process-zone-grid">
                {availableTypes.map((locationType) => (
                  <button
                    key={locationType}
                    type="button"
                    className="card selectable process-zone-card"
                    disabled={submitting}
                    onClick={() => loadAislesForSelection(selectedZone, locationType)}
                  >
                    <div className="process-zone-card__value">{locationType}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="process-actions">
              <Button variant="secondary" size="lg" onClick={resetToZonePicker}>
                {copy.startNextZone}
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && stage === "aisles" ? (
          <div className="app-card process-panel">
            <div>
              <h2 className="process-panel__title">{copy.chooseAisle}</h2>
              <p className="process-panel__subtitle">{copy.chooseAisleDesc}</p>
            </div>

            {availableAisles.length === 0 ? (
              <div className="app-empty-state">{copy.noAisles}</div>
            ) : (
              <div className="process-zone-grid">
                {availableAisles.map((aisle) => (
                  <button
                    key={aisle}
                    type="button"
                    className="card selectable process-zone-card"
                    disabled={submitting}
                    onClick={() =>
                      beginScope({
                        zone: selectedZone,
                        locationType: selectedLocationType,
                        aisle,
                      })
                    }
                  >
                    <div className="process-zone-card__value">{aisle}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="process-actions">
              <Button variant="secondary" size="lg" onClick={() => setStage("types")}>
                {copy.chooseAnotherType}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "scan" && currentLocation ? (
          <div className="app-card process-stage-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <ScanLine size={22} />
              </div>
              <div className="process-stage-header__text">
                  <h2>{copy.confirmLocationTitle}</h2>
                  <p>{copy.confirmLocationDesc}</p>
              </div>
            </div>

            <div className="scan-placeholder">{currentLocation.code}</div>

            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <input
                ref={scanInputRef}
                className="input"
                placeholder={copy.locationPlaceholder}
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleScanConfirm();
                  }
                }}
              />
              {isScannerEnabledForField("location") ? (
                <button
                  type="button"
                  className="app-icon-button"
                    onClick={() => openScanner("location", copy.scanLocation)}
                    aria-label={copy.openLocationScanner}
                  style={{ minWidth: 46, alignSelf: "stretch" }}
                >
                  <ScanLine size={18} />
                </button>
              ) : null}
            </div>

            <div className="process-actions">
              <Button size="lg" loading={submitting} onClick={handleScanConfirm}>
                {copy.confirmScan}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "decision" && currentLocation ? (
          <div className="app-card process-stage-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <ClipboardCheck size={22} />
              </div>
              <div className="process-stage-header__text">
                  <h2>{copy.emptyQuestion}</h2>
                  <p>{copy.emptyQuestionDesc.replace("{{zone}}", selectedZone)}</p>
              </div>
            </div>

            <div className="process-meta-grid">
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.zoneLabel}</div>
                <div className="process-meta-item__value">{selectedZone}</div>
              </div>
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.currentLocationLabel}</div>
                <div className="process-meta-item__value">{currentLocation.code}</div>
              </div>
            </div>

            <div className="process-section-card">
              <h3 className="process-section-card__title">{copy.quickConfirm}</h3>
              <div className="process-section-grid">
                <input
                  ref={decisionInputRef}
                  className="input"
                  placeholder={copy.quickConfirmPlaceholder}
                  value={decisionScanValue}
                  onChange={(event) => setDecisionScanValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleDecisionScanConfirm();
                    }
                  }}
                />
                {isScannerEnabledForField("location") ? (
                  <button
                    type="button"
                    className="app-icon-button"
                    onClick={() => openScanner("decision-location", copy.scanLocation)}
                    aria-label={copy.openDecisionScanner}
                    style={{ minWidth: 46, alignSelf: "stretch" }}
                  >
                    <ScanLine size={18} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="process-choice-grid">
              <button
                type="button"
                className="card selectable process-choice-card"
                disabled={submitting}
                onClick={handleConfirmEmpty}
              >
                <div className="process-choice-card__title">{copy.yesEmpty}</div>
                <div className="process-choice-card__desc">
                  {copy.yesEmptyDesc}
                </div>
              </button>

              <button
                type="button"
                className="card selectable process-choice-card"
                disabled={submitting}
                onClick={() => {
                  setError("");
                  setStage("surplus");
                }}
              >
                <div className="process-choice-card__title">{copy.addGoods}</div>
                <div className="process-choice-card__desc">
                  {copy.addGoodsDesc}
                </div>
              </button>

              <button
                type="button"
                className="card selectable process-choice-card"
                disabled={submitting}
                onClick={() => {
                  setError("");
                  setProblemNote("");
                  setStage("problem");
                }}
              >
                <div className="process-choice-card__title">{copy.reportProblem}</div>
                <div className="process-choice-card__desc">
                  {copy.reportProblemDesc}
                </div>
              </button>
            </div>
          </div>
        ) : null}

        {stage === "problem" && currentLocation ? (
          <div className="app-card process-stage-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <AlertTriangle size={22} />
              </div>
              <div className="process-stage-header__text">
                  <h2>{copy.issueTitle}</h2>
                  <p>{copy.issueDesc}</p>
              </div>
            </div>

            <textarea
              className="input"
                placeholder={copy.issueNotePlaceholder}
              value={problemNote}
              onChange={(event) => setProblemNote(event.target.value)}
              style={{ minHeight: 120 }}
            />

            <div className="process-choice-grid">
              {copy.problemOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="card selectable process-choice-card"
                  disabled={submitting}
                  onClick={() => handleProblemReport(option.value)}
                >
                  <div className="process-choice-card__title">{option.title}</div>
                  <div className="process-choice-card__desc">{option.description}</div>
                </button>
              ))}
            </div>

            <div className="process-actions">
              <Button variant="secondary" size="lg" onClick={() => setStage("decision")}>
                {copy.back}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "surplus" && currentLocation ? (
          <div className="app-card process-stage-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <PackagePlus size={22} />
              </div>
              <div className="process-stage-header__text">
                  <h2>{copy.surplusTitle.replace("{{location}}", currentLocation.code)}</h2>
                  <p>{copy.surplusDesc}</p>
              </div>
            </div>

            <div className="process-section-grid">
              <EanStepModern
                value={surplusData.ean}
                onChange={(value) => setSurplusData((current) => ({ ...current, ean: value }))}
                scannerEnabled={isScannerEnabledForField("ean")}
                onOpenScanner={() => openScanner("surplus-ean", copy.scanEan)}
              />
              <SkuStepModern
                value={surplusData.sku}
                onChange={(value) => setSurplusData((current) => ({ ...current, sku: value }))}
                scannerEnabled={isScannerEnabledForField("sku")}
                onOpenScanner={() => openScanner("surplus-sku", copy.scanSku)}
              />
              <LotStepModern
                value={surplusData.lot}
                onChange={(value) => setSurplusData((current) => ({ ...current, lot: value }))}
                scannerEnabled={isScannerEnabledForField("lot")}
                onOpenScanner={() => openScanner("surplus-lot", copy.scanLot)}
              />
              <QuantityStepModern
                value={surplusData.quantity}
                onChange={(value) => setSurplusData((current) => ({ ...current, quantity: value }))}
              />
            </div>

            <div className="process-actions">
              <Button size="lg" loading={submitting} onClick={handleSurplusSubmit}>
                {copy.saveGoods}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setStage("decision")}>
                {copy.back}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === "scope-finished" ? (
          <div className="app-card process-stage-card">
            <div className="process-stage-header">
              <div className="process-stage-header__icon">
                <CheckCircle2 size={22} />
              </div>
              <div className="process-stage-header__text">
                  <h2>{copy.zoneFinished}</h2>
                  <p>{copy.zoneFinishedDesc}</p>
              </div>
            </div>

            <div className="process-meta-grid">
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.zoneLabel}</div>
                <div className="process-meta-item__value">{selectedZone || "-"}</div>
              </div>
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.locationTypeLabel}</div>
                <div className="process-meta-item__value">{selectedLocationType || "-"}</div>
              </div>
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.aisleLabel}</div>
                <div className="process-meta-item__value">{selectedAisle || "-"}</div>
              </div>
              <div className="process-meta-item">
                  <div className="process-meta-item__label">{copy.checkedLocations}</div>
                <div className="process-meta-item__value">{totalLocations}</div>
              </div>
            </div>

            <div className="process-actions">
              {nextAisle ? (
                <Button
                  size="lg"
                  onClick={() =>
                    beginScope({
                      zone: selectedZone,
                      locationType: selectedLocationType,
                      aisle: nextAisle,
                    })
                  }
                >
                  {copy.startNextAisle}
                </Button>
              ) : null}
              <Button variant="secondary" size="lg" onClick={() => setStage("aisles")}>
                {copy.chooseAnotherAisle}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setStage("types")}>
                {copy.chooseAnotherType}
              </Button>
              <Button variant="secondary" size="lg" loading={submitting} onClick={handleExitProcess}>
                {copy.finishAndBack}
              </Button>
            </div>
          </div>
        ) : null}

        <BarcodeScannerModal
          open={scannerModal.open}
          title={scannerModal.title}
          description={copy.scannerDescription}
          formats={
            scannerModal.fieldKey?.includes("ean")
              ? getScanFieldConfig("ean")?.formats || []
              : scannerModal.fieldKey?.includes("sku")
                ? getScanFieldConfig("sku")?.formats || []
                : scannerModal.fieldKey?.includes("lot")
                  ? getScanFieldConfig("lot")?.formats || []
                  : getScanFieldConfig("location")?.formats || []
          }
          preferBackCamera={Boolean(scannerConfig.preferBackCamera)}
          autoCloseOnSuccess={Boolean(scannerConfig.autoCloseOnSuccess)}
          onDetected={handleScannerDetected}
          onClose={closeScanner}
        />
        <LoadingOverlay
          open={submitting}
          fullscreen
          message={copy.overlay}
        />
      </div>
    </PageShell>
  );
}
