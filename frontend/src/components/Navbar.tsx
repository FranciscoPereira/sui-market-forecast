import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",          label: "Markets"   },
  { href: "/portfolio", label: "Portfolio" },
];

export function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-sm">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>SUI Forecast</span>
          <span className="text-xs text-brand-500 font-medium bg-brand-500/10 px-1.5 py-0.5 rounded">
            TESTNET
          </span>
        </Link>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <ConnectButton />
      </div>
    </nav>
  );
}
