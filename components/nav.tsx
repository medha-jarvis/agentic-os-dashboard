import Link from 'next/link';
import { Home, Network } from 'lucide-react';

export function Nav() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl">
              Mission Control
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/knowledge"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Network className="h-4 w-4" />
                Knowledge Graph
              </Link>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Phase 3: Knowledge Graph
          </div>
        </div>
      </div>
    </nav>
  );
}
