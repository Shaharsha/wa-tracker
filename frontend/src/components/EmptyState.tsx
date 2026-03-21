interface Props {
  tab: "unanswered" | "dismissed" | "blocked";
}

export function EmptyState({ tab }: Props) {
  if (tab === "unanswered") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-sage-50 flex items-center justify-center mb-5 border border-sage-100">
          <svg className="w-7 h-7 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-serif text-2xl text-stone-700 mb-1">All caught up</p>
        <p className="text-sm text-stone-400">No one's waiting for a reply. Nice work.</p>
      </div>
    );
  }

  const label = tab === "dismissed" ? "skipped" : "blocked";

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {tab === "blocked" ? (
            <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>
          ) : (
            <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></>
          )}
        </svg>
      </div>
      <p className="font-serif text-lg text-stone-400">No {label} contacts</p>
    </div>
  );
}
