import React, { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import DataTablePanel from "../../components/data/DataTablePanelModern";
import ImportPreviewModal from "../../components/data/ImportPreviewModal";
import LoadingOverlay from "../../components/loaders/LoadingOverlay";
import { exportToCSV } from "../../utils/csvExport";
import {
  addWarehouseLocation,
  deleteWarehouseLocation,
  fetchLocationAisles,
  fetchLocationTypes,
  fetchLocationZones,
  fetchLocationsPage,
  replaceLocations,
  resetWarehouseMap,
  updateAllWarehouseLocationStatuses,
  updateWarehouseLocationStatus,
  updateWarehouseLocationStatuses,
  updateWarehouseLocationStatusesByZone,
} from "../../core/api/dataSectionApi";
import { buildLocationsImportPreview } from "../../core/upload/dataImports";
import { useAuth } from "../../core/auth/AppAuth";
import { useAppPreferences } from "../../core/preferences/AppPreferences";
import { fetchImportExportMapping } from "../../core/api/importExportConfigApi";
import { getEntityMapping, getMappedExportColumns } from "../../core/utils/importExportMapping";

const COPY = {
  pl: {
    loadError: "Blad pobierania mapy magazynu",
    loading: "Ladowanie mapy magazynu...",
    importSuccess: "Zaimportowano {{count}} lokalizacji.",
    promptCode: "Kod lokalizacji",
    promptZone: "Strefa",
    promptAisle: "Aleja",
    promptLevel: "Poziom",
    promptType: "Typ lokalizacji",
    title: "Mapa magazynu",
    resetAction: "Resetuj mape magazynu",
    resetSelectedAction: "Resetuj zaznaczone",
    resetZoneAction: "Resetuj status strefy",
    resetWarehouseStatusAction: "Resetuj status magazynu",
    addLabel: "Dodaj lokalizacje",
    searchPlaceholder: "Szukaj po kodzie lokalizacji...",
    previewTitle: "Podglad importu mapy magazynu",
    previewIntro: "Najpierw widzisz podsumowanie i probke lokalizacji. Import zapisze tylko poprawne rekordy, a duplikaty lub braki zostana pominiete.",
    deleteTitle: "Usun lokalizacje",
    deleteMessage: "Czy na pewno chcesz usunac lokalizacje {{code}}? Operacji nie da sie cofnac.",
    deleteConfirm: "Tak, usun lokalizacje",
    resetTitle: "Resetuj mape magazynu",
    resetMessage: "Czy na pewno chcesz zresetowac cala mape magazynu? Wszystkie lokalizacje zostana usuniete i konieczne bedzie ponowne wgranie mapy od zera.",
    resetConfirm: "Tak, resetuj mape",
    resetSelectedTitle: "Resetuj status zaznaczonych lokalizacji",
    resetSelectedMessage: "Czy na pewno chcesz ustawic status {{count}} zaznaczonych lokalizacji na pending?",
    resetSelectedConfirm: "Tak, resetuj zaznaczone",
    resetZoneTitle: "Resetuj status strefy",
    resetZoneMessage: "Czy na pewno chcesz ustawic status wszystkich lokalizacji w strefie {{zone}} na pending?",
    resetZoneConfirm: "Tak, resetuj strefe",
    resetWarehouseStatusTitle: "Resetuj status magazynu",
    resetWarehouseStatusMessage: "Czy na pewno chcesz ustawic status wszystkich lokalizacji w tym magazynie na pending?",
    resetWarehouseStatusConfirm: "Tak, resetuj magazyn",
    deleteSuccess: "Usunieto lokalizacje {{code}}.",
    resetStatusAction: "Zresetuj status",
    resetStatusSuccess: "Status lokalizacji {{code}} zmieniono na pending.",
    resetSelectedSuccess: "Status {{count}} lokalizacji zmieniono na pending.",
    resetZoneSuccess: "Status strefy {{zone}} zmieniono na pending.",
    resetWarehouseStatusSuccess: "Status wszystkich lokalizacji magazynu zmieniono na pending.",
    selectZoneFirst: "Najpierw wybierz strefe, aby zresetowac jej status.",
    selectRowsFirst: "Najpierw zaznacz lokalizacje do akcji masowej.",
    resetSuccess: "Mapa magazynu zostala zresetowana. Aby pracowac dalej, wgraj nowy plik mapy.",
    actionError: "Nie udalo sie wykonac operacji na mapie magazynu",
    close: "Zamknij",
    cancel: "Anuluj",
    irreversible: "Ta operacja jest nieodwracalna. Przed potwierdzeniem upewnij sie, ze chcesz trwale usunac wskazane dane z mapy magazynu.",
    resetLoading: "Resetuje cala mape magazynu i czyszcze lokalizacje...",
    deleteLoading: "Usuwam wskazana lokalizacje z mapy magazynu...",
    statusResetLoading: "Przywracam status lokalizacji do pending...",
    statusResetSelectedLoading: "Przywracam status zaznaczonych lokalizacji do pending...",
    statusResetZoneLoading: "Przywracam status calej strefy do pending...",
    statusResetWarehouseLoading: "Przywracam status calego magazynu do pending...",
    importLoading: "Analizuje plik mapy magazynu i przygotowuje podglad importu...",
    processingMessage: "Resetuje mape i importuje nowy zestaw lokalizacji...",
    allTypes: "Wszystkie typy",
    allAisles: "Wszystkie aleje",
    columns: {
      code: "Lokalizacja",
      zone: "Strefa",
      aisle: "Aleja",
      level: "Poziom",
      location_type: "Typ lokalizacji",
      status: "Status",
    },
  },
  en: {
    loadError: "Could not load the warehouse map",
    loading: "Loading warehouse map...",
    importSuccess: "Imported {{count}} locations.",
    promptCode: "Location code",
    promptZone: "Zone",
    promptAisle: "Aisle",
    promptLevel: "Level",
    promptType: "Location type",
    title: "Warehouse map",
    resetAction: "Reset warehouse map",
    resetSelectedAction: "Reset selected",
    resetZoneAction: "Reset zone status",
    resetWarehouseStatusAction: "Reset warehouse status",
    addLabel: "Add location",
    searchPlaceholder: "Search by location code...",
    previewTitle: "Warehouse map import preview",
    previewIntro: "First you see the summary and sample locations. The import will save only valid records and skip duplicates or missing data.",
    deleteTitle: "Delete location",
    deleteMessage: "Are you sure you want to delete location {{code}}? This action cannot be undone.",
    deleteConfirm: "Yes, delete location",
    resetTitle: "Reset warehouse map",
    resetMessage: "Are you sure you want to reset the entire warehouse map? All locations will be removed and the map will need to be uploaded again from scratch.",
    resetConfirm: "Yes, reset map",
    resetSelectedTitle: "Reset selected location statuses",
    resetSelectedMessage: "Are you sure you want to change {{count}} selected locations back to pending?",
    resetSelectedConfirm: "Yes, reset selected",
    resetZoneTitle: "Reset zone status",
    resetZoneMessage: "Are you sure you want to change all locations in zone {{zone}} back to pending?",
    resetZoneConfirm: "Yes, reset zone",
    resetWarehouseStatusTitle: "Reset warehouse status",
    resetWarehouseStatusMessage: "Are you sure you want to change all locations in this warehouse back to pending?",
    resetWarehouseStatusConfirm: "Yes, reset warehouse",
    deleteSuccess: "Deleted location {{code}}.",
    resetStatusAction: "Reset status",
    resetStatusSuccess: "Location {{code}} status has been changed to pending.",
    resetSelectedSuccess: "{{count}} locations have been changed back to pending.",
    resetZoneSuccess: "Zone {{zone}} has been changed back to pending.",
    resetWarehouseStatusSuccess: "All warehouse location statuses have been changed back to pending.",
    selectZoneFirst: "Select a zone first to reset the zone status.",
    selectRowsFirst: "Select locations first to run a bulk action.",
    resetSuccess: "The warehouse map has been reset. Upload a new map file to continue working.",
    actionError: "Could not complete the warehouse map action",
    close: "Close",
    cancel: "Cancel",
    irreversible: "This action is irreversible. Before confirming, make sure you really want to permanently remove the selected data from the warehouse map.",
    resetLoading: "Resetting the full warehouse map and clearing locations...",
    deleteLoading: "Deleting the selected location from the warehouse map...",
    statusResetLoading: "Resetting the location status back to pending...",
    statusResetSelectedLoading: "Resetting selected locations back to pending...",
    statusResetZoneLoading: "Resetting the whole zone back to pending...",
    statusResetWarehouseLoading: "Resetting the whole warehouse back to pending...",
    importLoading: "Analyzing the warehouse map file and preparing the import preview...",
    processingMessage: "Resetting the map and importing the new location set...",
    allTypes: "All location types",
    allAisles: "All aisles",
    columns: {
      code: "Location",
      zone: "Zone",
      aisle: "Aisle",
      level: "Level",
      location_type: "Location type",
      status: "Status",
    },
  },
  de: {
    loadError: "Lagerkarte konnte nicht geladen werden",
    loading: "Lagerkarte wird geladen...",
    importSuccess: "{{count}} Lokationen wurden importiert.",
    promptCode: "Lokationscode",
    promptZone: "Zone",
    promptAisle: "Gang",
    promptLevel: "Ebene",
    promptType: "Lokationstyp",
    title: "Lagerkarte",
    resetAction: "Lagerkarte zurucksetzen",
    resetSelectedAction: "Auswahl zurucksetzen",
    resetZoneAction: "Zonenstatus zurucksetzen",
    resetWarehouseStatusAction: "Lagerstatus zurucksetzen",
    addLabel: "Lokation hinzufugen",
    searchPlaceholder: "Nach Lokationscode suchen...",
    previewTitle: "Importvorschau Lagerkarte",
    previewIntro: "Zuerst siehst du die Zusammenfassung und eine Lokationsprobe. Der Import speichert nur gultige Datensatze und uberspringt Duplikate oder fehlende Werte.",
    deleteTitle: "Lokation loschen",
    deleteMessage: "Mochtest du die Lokation {{code}} wirklich loschen? Diese Aktion kann nicht ruckgangig gemacht werden.",
    deleteConfirm: "Ja, Lokation loschen",
    resetTitle: "Lagerkarte zurucksetzen",
    resetMessage: "Mochtest du die komplette Lagerkarte wirklich zurucksetzen? Alle Lokationen werden entfernt und die Karte muss anschliessend neu hochgeladen werden.",
    resetConfirm: "Ja, Karte zurucksetzen",
    resetSelectedTitle: "Status der ausgewahlten Lokationen zurucksetzen",
    resetSelectedMessage: "Mochtest du den Status von {{count}} ausgewahlten Lokationen wirklich auf pending setzen?",
    resetSelectedConfirm: "Ja, Auswahl zurucksetzen",
    resetZoneTitle: "Zonenstatus zurucksetzen",
    resetZoneMessage: "Mochtest du den Status aller Lokationen in Zone {{zone}} wirklich auf pending setzen?",
    resetZoneConfirm: "Ja, Zone zurucksetzen",
    resetWarehouseStatusTitle: "Lagerstatus zurucksetzen",
    resetWarehouseStatusMessage: "Mochtest du den Status aller Lokationen in diesem Lager wirklich auf pending setzen?",
    resetWarehouseStatusConfirm: "Ja, Lager zurucksetzen",
    deleteSuccess: "Lokation {{code}} wurde geloscht.",
    resetStatusAction: "Status zurucksetzen",
    resetStatusSuccess: "Der Status der Lokation {{code}} wurde auf pending gesetzt.",
    resetSelectedSuccess: "Der Status von {{count}} Lokationen wurde auf pending gesetzt.",
    resetZoneSuccess: "Der Status der Zone {{zone}} wurde auf pending gesetzt.",
    resetWarehouseStatusSuccess: "Der Status aller Lokationen im Lager wurde auf pending gesetzt.",
    selectZoneFirst: "Wahle zuerst eine Zone aus, um den Zonenstatus zuruckzusetzen.",
    selectRowsFirst: "Wahle zuerst Lokationen fur die Sammelaktion aus.",
    resetSuccess: "Die Lagerkarte wurde zuruckgesetzt. Lade eine neue Kartendatei hoch, um weiterzuarbeiten.",
    actionError: "Die Aktion fur die Lagerkarte konnte nicht ausgefuhrt werden",
    close: "Schliessen",
    cancel: "Abbrechen",
    irreversible: "Diese Aktion ist irreversibel. Vergewissere dich vor der Bestatigung, dass du die ausgewahlten Daten dauerhaft aus der Lagerkarte entfernen willst.",
    resetLoading: "Die gesamte Lagerkarte wird zuruckgesetzt und Lokationen werden entfernt...",
    deleteLoading: "Die ausgewahlte Lokation wird aus der Lagerkarte entfernt...",
    statusResetLoading: "Der Status der Lokation wird auf pending zuruckgesetzt...",
    statusResetSelectedLoading: "Der Status der ausgewahlten Lokationen wird auf pending zuruckgesetzt...",
    statusResetZoneLoading: "Der Status der gesamten Zone wird auf pending zuruckgesetzt...",
    statusResetWarehouseLoading: "Der Status des gesamten Lagers wird auf pending zuruckgesetzt...",
    importLoading: "Datei der Lagerkarte wird analysiert und Importvorschau wird vorbereitet...",
    processingMessage: "Karte wird zuruckgesetzt und neuer Lokationssatz wird importiert...",
    allTypes: "Alle Lokationstypen",
    allAisles: "Alle Gange",
    columns: {
      code: "Lokation",
      zone: "Zone",
      aisle: "Gang",
      level: "Ebene",
      location_type: "Lokationstyp",
      status: "Status",
    },
  },
};

export default function WarehouseMapPanel() {
  const { user } = useAuth();
  const { language } = useAppPreferences();
  const copy = COPY[language] || COPY.pl;
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("code");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [locationTypeFilter, setLocationTypeFilter] = useState("all");
  const [aisleFilter, setAisleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [zones, setZones] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [aisles, setAisles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapping, setMapping] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [importPreparing, setImportPreparing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const limit = 50;

  async function loadRows() {
    try {
      setLoading(true);
      const response = await fetchLocationsPage({
        page,
        limit,
        search,
        zone: zoneFilter,
        locationType: locationTypeFilter,
        aisle: aisleFilter,
        sortKey,
      });
      setRows(response.data);
      setHasNextPage(Boolean(response.hasMore));
      setSelectedRowIds((current) =>
        current.filter((id) => (response.data || []).some((row) => row.id === id))
      );
      setError("");
    } catch (err) {
      setError(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [page, search, zoneFilter, locationTypeFilter, aisleFilter, sortKey]);

  useEffect(() => {
    async function loadZones() {
      try {
        setZones(await fetchLocationZones());
      } catch (err) {
        console.error("WAREHOUSE ZONES LOAD ERROR:", err);
      }
    }

    loadZones();
  }, []);

  useEffect(() => {
    async function loadTypes() {
      try {
        setLocationTypes(
          await fetchLocationTypes({
            zone: zoneFilter,
          })
        );
      } catch (err) {
        console.error("WAREHOUSE TYPES LOAD ERROR:", err);
      }
    }

    loadTypes();
  }, [zoneFilter]);

  useEffect(() => {
    async function loadAisles() {
      try {
        setAisles(
          await fetchLocationAisles({
            zone: zoneFilter,
            locationType: locationTypeFilter,
          })
        );
      } catch (err) {
        console.error("WAREHOUSE AISLES LOAD ERROR:", err);
      }
    }

    loadAisles();
  }, [zoneFilter, locationTypeFilter]);

  async function refreshZones() {
    const nextZones = await fetchLocationZones();
    setZones(nextZones);
  }

  async function refreshLocationTypes() {
    const nextTypes = await fetchLocationTypes({ zone: zoneFilter });
    setLocationTypes(nextTypes);
  }

  async function refreshAisles() {
    const nextAisles = await fetchLocationAisles({
      zone: zoneFilter,
      locationType: locationTypeFilter,
    });
    setAisles(nextAisles);
  }

  useEffect(() => {
    async function loadMapping() {
      try {
        setMapping(await fetchImportExportMapping(user?.site_id || null));
      } catch (err) {
        console.error("LOCATIONS MAPPING LOAD ERROR:", err);
      }
    }

    loadMapping();
  }, [user?.site_id]);

  const openImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setImportPreparing(true);
        setPreview(await buildLocationsImportPreview(file, getEntityMapping(mapping, "locations")?.import));
      } catch (err) {
        alert(err.message);
      } finally {
        setImportPreparing(false);
      }
    };
    input.click();
  };

  const confirmImport = async () => {
    try {
      setImporting(true);
      await replaceLocations(preview.valid);
      alert(copy.importSuccess.replace("{{count}}", String(preview.valid.length)));
      setPreview(null);
      setPage(1);
      await refreshZones();
      await refreshLocationTypes();
      await refreshAisles();
    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async () => {
    const code = window.prompt(copy.promptCode);
    const zone = window.prompt(copy.promptZone);
    const aisle = window.prompt(copy.promptAisle);
    const level = window.prompt(copy.promptLevel);
    const locationType = window.prompt(copy.promptType);

    if (!code || !zone || !aisle || !level || !locationType) return;

    try {
      await addWarehouseLocation({
        code,
        zone,
        aisle,
        level,
        location_type: locationType,
        status: "active",
      });
      setPage(1);
      await refreshZones();
      await refreshLocationTypes();
      await refreshAisles();
      if (page === 1) {
        await loadRows();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const openDeleteConfirm = (row) => {
    setConfirmModal({
      mode: "delete",
      title: copy.deleteTitle,
      message: copy.deleteMessage.replace("{{code}}", row.code),
      confirmLabel: copy.deleteConfirm,
      row,
    });
  };

  const handleResetStatus = async (row) => {
    if (!row?.id) return;

    try {
      setProcessing(true);
      await updateWarehouseLocationStatus(row.id, "pending");
      alert(copy.resetStatusSuccess.replace("{{code}}", row.code));
      await loadRows();
    } catch (err) {
      alert(err.message || copy.actionError);
    } finally {
      setProcessing(false);
    }
  };

  const openResetConfirm = () => {
    setConfirmModal({
      mode: "reset",
      title: copy.resetTitle,
      message: copy.resetMessage,
      confirmLabel: copy.resetConfirm,
    });
  };

  const openResetSelectedConfirm = () => {
    if (!selectedRowIds.length) {
      alert(copy.selectRowsFirst);
      return;
    }

    setConfirmModal({
      mode: "reset-selected",
      title: copy.resetSelectedTitle,
      message: copy.resetSelectedMessage.replace("{{count}}", String(selectedRowIds.length)),
      confirmLabel: copy.resetSelectedConfirm,
    });
  };

  const openResetZoneStatusConfirm = () => {
    if (zoneFilter === "all") {
      alert(copy.selectZoneFirst);
      return;
    }

    setConfirmModal({
      mode: "reset-zone-status",
      title: copy.resetZoneTitle,
      message: copy.resetZoneMessage.replace("{{zone}}", zoneFilter),
      confirmLabel: copy.resetZoneConfirm,
    });
  };

  const openResetWarehouseStatusConfirm = () => {
    setConfirmModal({
      mode: "reset-warehouse-status",
      title: copy.resetWarehouseStatusTitle,
      message: copy.resetWarehouseStatusMessage,
      confirmLabel: copy.resetWarehouseStatusConfirm,
    });
  };

  const closeConfirm = () => {
    if (!processing) {
      setConfirmModal(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;

    try {
      setProcessing(true);

      if (confirmModal.mode === "delete" && confirmModal.row?.id) {
        await deleteWarehouseLocation(confirmModal.row.id);
        alert(copy.deleteSuccess.replace("{{code}}", confirmModal.row.code));
        setSelectedRowIds((current) => current.filter((id) => id !== confirmModal.row.id));
        await refreshZones();
        await refreshLocationTypes();
        await refreshAisles();
        if (page === 1) {
          await loadRows();
        }
      }

      if (confirmModal.mode === "reset") {
        await resetWarehouseMap();
        setPage(1);
        setSearch("");
        setZoneFilter("all");
        setLocationTypeFilter("all");
        setAisleFilter("all");
        setLocationTypes([]);
        setAisles([]);
        setSelectedRowIds([]);
        await refreshZones();
        alert(copy.resetSuccess);
      }

      if (confirmModal.mode === "reset-selected") {
        await updateWarehouseLocationStatuses(selectedRowIds, "pending");
        alert(copy.resetSelectedSuccess.replace("{{count}}", String(selectedRowIds.length)));
        setSelectedRowIds([]);
        await loadRows();
      }

      if (confirmModal.mode === "reset-zone-status") {
        await updateWarehouseLocationStatusesByZone(zoneFilter, "pending");
        alert(copy.resetZoneSuccess.replace("{{zone}}", zoneFilter));
        setSelectedRowIds([]);
        await loadRows();
      }

      if (confirmModal.mode === "reset-warehouse-status") {
        await updateAllWarehouseLocationStatuses("pending");
        alert(copy.resetWarehouseStatusSuccess);
        setSelectedRowIds([]);
        await loadRows();
      }

      setConfirmModal(null);
    } catch (err) {
      alert(err.message || copy.actionError);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div>{copy.loading}</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      <DataTablePanel
        title={copy.title}
        columns={[
          { key: "code", label: copy.columns.code },
          { key: "zone", label: copy.columns.zone },
          { key: "aisle", label: copy.columns.aisle },
          { key: "level", label: copy.columns.level },
          { key: "location_type", label: copy.columns.location_type },
          { key: "status", label: copy.columns.status },
        ]}
        data={rows}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onSortChange={setSortKey}
        onLocationChange={(value) => {
          setPage(1);
          setZoneFilter(value);
          setLocationTypeFilter("all");
          setAisleFilter("all");
        }}
        locationsList={zones}
        locationValue={zoneFilter}
        additionalFilters={[
          {
            key: "location-type",
            value: locationTypeFilter,
            onChange: (value) => {
              setPage(1);
              setLocationTypeFilter(value);
              setAisleFilter("all");
            },
            options: locationTypes,
            allLabel: copy.allTypes,
          },
          {
            key: "aisle",
            value: aisleFilter,
            onChange: (value) => {
              setPage(1);
              setAisleFilter(value);
            },
            options: aisles,
            allLabel: copy.allAisles,
          },
        ]}
        onImport={openImport}
        onExport={() =>
          exportToCSV({
            data: rows,
            columns: getMappedExportColumns("locations", mapping),
            fileName: "warehouse-map.csv",
          })
        }
        extraActions={
          <>
            <Button variant="secondary" onClick={openResetSelectedConfirm}>
              {copy.resetSelectedAction}
            </Button>
            <Button variant="secondary" onClick={openResetZoneStatusConfirm}>
              {copy.resetZoneAction}
            </Button>
            <Button variant="secondary" onClick={openResetWarehouseStatusConfirm}>
              {copy.resetWarehouseStatusAction}
            </Button>
            <Button variant="secondary" onClick={openResetConfirm}>
              {copy.resetAction}
            </Button>
          </>
        }
        selectedRowIds={selectedRowIds}
        onToggleRow={(row, checked) => {
          setSelectedRowIds((current) =>
            checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id)
          );
        }}
        onToggleAllRows={(rowIds, checked) => {
          setSelectedRowIds((current) => {
            const currentSet = new Set(current);
            if (checked) {
              rowIds.forEach((id) => currentSet.add(id));
            } else {
              rowIds.forEach((id) => currentSet.delete(id));
            }
            return Array.from(currentSet);
          });
        }}
        renderActions={(row) => (
          <Button variant="secondary" onClick={() => handleResetStatus(row)}>
            {copy.resetStatusAction}
          </Button>
        )}
        onDelete={openDeleteConfirm}
        onAdd={handleAdd}
        addLabel={copy.addLabel}
        page={page}
        onPageChange={setPage}
        hasNextPage={hasNextPage}
        pageSize={limit}
        searchPlaceholder={copy.searchPlaceholder}
      />

      {preview && (
        <ImportPreviewModal
          title={copy.previewTitle}
          intro={copy.previewIntro}
          preview={preview}
          columns={[
            { key: "code", label: copy.columns.code },
            { key: "zone", label: copy.columns.zone },
            { key: "aisle", label: copy.columns.aisle },
            { key: "level", label: copy.columns.level },
            { key: "location_type", label: copy.columns.location_type },
            { key: "status", label: copy.columns.status },
          ]}
          getRowKey={(row, index) => `${row.code || "code"}-${index}`}
          getRowValue={(row, key) => row[key] || "-"}
          getInvalidLabel={(row) => row.code || "(missing location)"}
          onConfirm={confirmImport}
          onCancel={() => setPreview(null)}
          processing={importing}
          processingMessage={copy.processingMessage}
        />
      )}

      {confirmModal ? (
        <div className="history-modal-overlay" onClick={closeConfirm}>
          <div className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="history-modal__header">
              <div>
                <h2 className="process-panel__title" style={{ fontSize: 26, margin: 0 }}>
                  {confirmModal.title}
                </h2>
                <p className="process-panel__subtitle">{confirmModal.message}</p>
              </div>
              <Button variant="secondary" onClick={closeConfirm} disabled={processing}>
                {copy.close}
              </Button>
            </div>

            <div className="app-card" style={{ marginTop: 16, border: "1px solid rgba(210, 76, 76, 0.18)" }}>
              {copy.irreversible}
            </div>

            <div className="process-actions" style={{ marginTop: 20 }}>
              <Button loading={processing} onClick={handleConfirmAction}>
                {confirmModal.confirmLabel}
              </Button>
              <Button variant="secondary" onClick={closeConfirm} disabled={processing}>
                {copy.cancel}
              </Button>
            </div>
            <LoadingOverlay
              open={processing}
              message={
                confirmModal.mode === "reset"
                  ? copy.resetLoading
                  : confirmModal.mode === "reset-selected"
                    ? copy.statusResetSelectedLoading
                    : confirmModal.mode === "reset-zone-status"
                      ? copy.statusResetZoneLoading
                      : confirmModal.mode === "reset-warehouse-status"
                        ? copy.statusResetWarehouseLoading
                        : copy.deleteLoading
              }
            />
          </div>
        </div>
      ) : null}
      <LoadingOverlay
        open={processing && !confirmModal}
        fullscreen
        message={copy.statusResetLoading}
      />
      <LoadingOverlay
        open={importPreparing}
        fullscreen
        message={copy.importLoading}
      />
    </>
  );
}
