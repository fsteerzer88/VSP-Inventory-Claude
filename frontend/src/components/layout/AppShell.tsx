import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanLine,
  PackageMinus,
  Boxes,
  Package,
  MapPin,
  Users,
} from "lucide-react";

const primaryNav = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/scan/intake", label: "Intake", icon: ScanLine },
  { to: "/scan/checkout", label: "Checkout", icon: PackageMinus },
  { to: "/inventory", label: "Inventory", icon: Boxes },
];

const secondaryNav = [
  { to: "/products", label: "Products", icon: Package },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/users", label: "Users", icon: Users },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:flex md:flex-col md:gap-6">
        <div className="px-2 py-1">
          <p className="text-lg font-semibold tracking-tight">VSP Inventory</p>
        </div>
        <nav className="flex flex-col gap-1">
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <nav className="flex flex-col gap-1">
            {secondaryNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <p className="text-base font-semibold tracking-tight">VSP Inventory</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background md:hidden">
          {primaryNav.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
}
