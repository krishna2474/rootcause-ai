const bar = "animate-pulse rounded-md bg-line/80 motion-reduce:animate-none";

export function AppSkeleton() {
  return (
    <div className="space-y-3 p-3" aria-busy="true" aria-label="Loading">
      <div className="rounded-2xl bg-card p-4">
        <div className={`${bar} mb-4 h-4 w-40`} />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`${bar} size-12 rounded-2xl`} />
              <div className={`${bar} h-3 w-12`} />
            </div>
          ))}
        </div>
      </div>
      <div className={`${bar} h-24 rounded-2xl`} />
      <div className="space-y-4 rounded-2xl bg-card p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`${bar} size-10 rounded-full`} />
            <div className="flex-1 space-y-1.5">
              <div className={`${bar} h-3.5 w-32`} />
              <div className={`${bar} h-3 w-20`} />
            </div>
            <div className={`${bar} h-4 w-14`} />
          </div>
        ))}
      </div>
    </div>
  );
}
