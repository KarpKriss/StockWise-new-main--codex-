import { Package, Truck, Warehouse } from "lucide-react";

export default function LogisticsLoader({
  message = "Ladowanie danych...",
  compact = false,
}) {
  return (
    <div className={`logistics-loader ${compact ? "logistics-loader--compact" : ""}`}>
      <div className="logistics-loader__scene" aria-hidden="true">
        <div className="logistics-loader__depot">
          <Warehouse size={compact ? 16 : 18} />
        </div>
        <div className="logistics-loader__track">
          <div className="logistics-loader__box logistics-loader__box--one">
            <Package size={compact ? 11 : 14} />
          </div>
          <div className="logistics-loader__box logistics-loader__box--two">
            <Package size={compact ? 11 : 14} />
          </div>
          <div className="logistics-loader__box logistics-loader__box--three">
            <Package size={compact ? 11 : 14} />
          </div>
        </div>
        <div className="logistics-loader__truck">
          <Truck size={compact ? 16 : 18} />
        </div>
      </div>
      <div className="logistics-loader__message">{message}</div>
    </div>
  );
}
