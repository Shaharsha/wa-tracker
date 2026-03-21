interface Props {
  isDismissed: boolean;
  onDismiss: () => void;
  onUndismiss: () => void;
}

export function DismissButton({ isDismissed, onDismiss, onUndismiss }: Props) {
  if (isDismissed) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUndismiss();
        }}
        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition-colors cursor-pointer"
      >
        Restore
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
    >
      Dismiss
    </button>
  );
}
