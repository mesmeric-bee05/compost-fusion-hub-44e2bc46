import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Structured log so future Sentry hookup is one line.
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden />
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            We've logged the error. Please try again or contact us if it keeps happening.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={this.handleReset}>Go home</Button>
            <Button variant="outline" asChild>
              <a href="/contact">Report issue</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
