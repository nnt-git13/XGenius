import React from "react";

export default class DevBoundary extends React.Component<
  { label?: string; children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error("[DevBoundary]", this.props.label, error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">
          <div className="font-semibold mb-1">Render error in {this.props.label ?? "component"}</div>
          <div className="text-xs">{String(this.state.error.message)}</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
