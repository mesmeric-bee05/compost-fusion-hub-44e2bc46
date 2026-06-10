import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealtimeTransport } from "@/hooks/usePaymentStatus";
import { cn } from "@/lib/utils";

interface Props {
  transport: RealtimeTransport;
  onReconnect?: () => void;
  className?: string;
}

const CONFIG: Record<RealtimeTransport, { dot: string; label: string; icon: typeof Wifi }> = {
  connecting: { dot: "bg-muted-foreground", label: "Connecting…", icon: Wifi },
  realtime: { dot: "bg-emerald-500", label: "Live updates", icon: Wifi },
  polling: {
    dot: "bg-amber-500",
    label: "Live updates unavailable — checking every 4s",
    icon: WifiOff,
  },
  disconnected: { dot: "bg-destructive", label: "Disconnected", icon: WifiOff },
};

export default function PaymentStatusBadge({ transport, onReconnect, className }: Props) {
  const cfg = CONFIG[transport];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs",
        className,
      )}
      role="status"
      aria-live="polite"
      data-testid="payment-status-badge"
      data-transport={transport}
    >
      <span className={cn("inline-block h-2 w-2 rounded-full", cfg.dot)} aria-hidden="true" />
      <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">{cfg.label}</span>
      {(transport === "polling" || transport === "disconnected") && onReconnect && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[11px]"
          onClick={onReconnect}
          aria-label="Reconnect live updates"
        >
          <RefreshCw className="mr-1 h-3 w-3" /> Retry
        </Button>
      )}
    </div>
  );
}
