"use client";

import Link from "next/link";

type Props = { href?: string; label?: string };

export default function BackButton({ href = "/role", label = "Back" }: Props) {
  return (
    <Link href={href} className="btn" aria-label="Back to main menu">
      ← {label}
    </Link>
  );
}

