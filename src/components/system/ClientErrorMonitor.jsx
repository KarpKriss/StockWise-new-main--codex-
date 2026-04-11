import { useEffect } from "react";
import { useAuth } from "../../core/auth/AppAuth";
import { logClientError } from "../../core/api/logsApi";

function serializeReason(reason) {
  if (!reason) return {};
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message,
      stack: reason.stack || null,
    };
  }
  if (typeof reason === "object") {
    return reason;
  }
  return { value: String(reason) };
}

export default function ClientErrorMonitor() {
  const { user } = useAuth();

  useEffect(() => {
    const handleError = (event) => {
      logClientError({
        userId: user?.id || null,
        area: "window.error",
        message: event.message || "Unhandled client error",
        details: {
          filename: event.filename || null,
          lineno: event.lineno || null,
          colno: event.colno || null,
          stack: event.error?.stack || null,
        },
      });
    };

    const handleUnhandledRejection = (event) => {
      const reason = serializeReason(event.reason);
      logClientError({
        userId: user?.id || null,
        area: "window.unhandledrejection",
        message: reason.message || "Unhandled promise rejection",
        details: reason,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [user?.id]);

  return null;
}
