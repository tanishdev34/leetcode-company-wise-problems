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
  it("keeps the authenticated desktop nav constrained inside the viewport", () => {
    render(<Navbar />)

    const navRail = screen.getByRole("link", { name: "Dashboard" }).parentElement
    const desktopNav = screen.getByRole("link", { name: "Companies" }).parentElement

    expect(navRail).toHaveClass("min-w-0")
    expect(navRail).toHaveClass("overflow-x-auto")
    expect(desktopNav).toHaveClass("min-w-0")
    expect(screen.queryByPlaceholderText("Search questions...")).not.toBeInTheDocument()
  })
})
