import LogisticsLoader from "./LogisticsLoader";

export default function LoadingOverlay({
  open = false,
  message = "Ladowanie danych...",
  fullscreen = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className={`loading-overlay ${fullscreen ? "loading-overlay--fullscreen" : ""}`}>
      <div className="loading-overlay__panel">
        <LogisticsLoader message={message} />
      </div>
    </div>
  );
}
