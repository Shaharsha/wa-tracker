export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="text-5xl mb-4">&#10003;</div>
      <p className="text-lg font-medium">All caught up!</p>
      <p className="text-sm mt-1">No unanswered messages right now.</p>
    </div>
  );
}
