import { Component, type ErrorInfo, type ReactNode } from "react";

const PREFIX = "stocknest:v2:";

/**
 * If something goes wrong while showing a screen, show a way out instead of a blank page:
 * reload, save a backup of what's stored, or start again.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("StockNest hit a problem", error, info.componentStack);
  }

  saveBackup = () => {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PREFIX)) continue;
      try {
        data[key.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(key) ?? "null");
      } catch {
        data[key.slice(PREFIX.length)] = localStorage.getItem(key);
      }
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "stocknest-saved-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  startAgain = () => {
    if (!window.confirm("This removes everything StockNest saved in this browser. Save a copy first if you need it. Continue?")) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const button = "h-11 px-4 rounded-[10px] text-[15px] font-semibold cursor-pointer";
    return (
      <main className="min-h-screen bg-page flex items-center justify-center p-6">
        <div role="alert" className="max-w-[480px] bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted">
            StockNest couldn't show this screen. Your data is still saved in this browser. Try reloading first. If it keeps happening, save a copy of your
            data, then start again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${button} bg-accent text-white`} onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" className={`${button} border border-input bg-white`} onClick={this.saveBackup}>
              Save a copy of my data
            </button>
            <button type="button" className={`${button} text-danger`} onClick={this.startAgain}>
              Start again
            </button>
          </div>
        </div>
      </main>
    );
  }
}
