interface SyncStatusBarProps {
  online: boolean;
  pendingCount: number;
  lastCachedAt?: string;
  syncing: boolean;
  onSync: () => void;
}

export default function SyncStatusBar({
  online,
  pendingCount,
  lastCachedAt,
  syncing,
  onSync,
}: SyncStatusBarProps) {
  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm ${
        online
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          : "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
      }`}
    >
      <div className="min-w-0 flex items-center gap-3">
        <div
          className={`shrink-0 w-3 h-3 rounded-full ${
            online ? "bg-green-500 animate-pulse" : "bg-amber-400"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {online ? "Online" : "Offline mode"}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {pendingCount > 0
              ? `${pendingCount} batch(es) waiting to sync`
              : lastCachedAt
                ? `Cached ${new Date(lastCachedAt).toLocaleString()}`
                : "Sync students when online"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={!online || syncing}
        className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
          online && !syncing
            ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-sm hover:shadow-md active:scale-95"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        {syncing ? "⏳ Syncing…" : "🔄 Sync"}
      </button>
    </div>
  );
}
