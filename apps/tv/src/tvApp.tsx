import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

export default function TvApp() {
  const { ref, focused, focusSelf } = useFocusable({ trackChildren: true });
  return (
    <div ref={ref} className="min-h-screen p-safe flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold">Family Fun — TV</h1>
      <button
        onFocus={focusSelf}
        className={`px-10 py-6 rounded text-2xl ${focused ? 'bg-blue-500' : 'bg-gray-700'}`}
      >
        Start Session
      </button>
    </div>
  );
}

