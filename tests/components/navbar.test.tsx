import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Navbar } from "@/components/navbar"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/auth-client", () => ({
  signOut: vi.fn(),
  useSession: () => ({
    data: { user: { id: "user-1", email: "test@example.com" } },
  }),
}))

vi.mock("@/components/command-palette", () => ({
  CommandPalette: () => null,
}))

describe("Navbar", () => {
  it("uses primary links plus a more menu instead of a horizontal scroll rail", () => {
    render(<Navbar />)

    const desktopNav = screen.getByRole("link", { name: "Companies" }).parentElement

    expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Playground" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Codeforces" })).not.toBeInTheDocument()
    expect(desktopNav).toHaveClass("min-w-0")
    expect(screen.queryByPlaceholderText("Search questions...")).not.toBeInTheDocument()
  })
})
