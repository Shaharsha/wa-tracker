interface Props {
  isDismissed: boolean;
  onDismiss: () => void;
  onUndismiss: () => void;
}

export function DismissButton({ isDismissed, onDismiss, onUndismiss }: Props) {
  if (isDismissed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onUndismiss(); }}
        className="text-[11px] font-medium bg-sage-50 hover:bg-sage-100 text-sage-600 px-2.5 py-1 rounded-lg border border-sage-100 transition-all cursor-pointer hover:shadow-sm"
      >
        Restore
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      className="text-[11px] text-stone-300 hover:text-stone-500 px-2 py-1 rounded-lg hover:bg-stone-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
    >
      Dismiss
    </button>
  );
}
