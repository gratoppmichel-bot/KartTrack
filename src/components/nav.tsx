"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Sessions" },
  { href: "/leaderboard", label: "Rangliste" },
  { href: "/friends", label: "Freunde" },
];

export function Nav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/offline")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" || pathname.startsWith("/sessions") : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`block py-3 text-center text-sm font-semibold ${active ? "text-rose-500" : "text-neutral-400"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
