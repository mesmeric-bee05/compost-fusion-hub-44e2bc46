import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RoleRoute from "../RoleRoute";

const mockAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth() }));

function renderAt(initial = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin" element={<RoleRoute role="admin"><div>ADMIN_AREA</div></RoleRoute>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        <Route path="/auth" element={<div>SIGN_IN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleRoute", () => {
  beforeEach(() => mockAuth.mockReset());

  it("shows loading state", () => {
    mockAuth.mockReturnValue({ user: null, role: null, loading: true });
    renderAt();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    mockAuth.mockReturnValue({ user: null, role: null, loading: false });
    renderAt();
    expect(screen.getByText("SIGN_IN")).toBeInTheDocument();
  });

  it("redirects wrong-role users away", () => {
    mockAuth.mockReturnValue({ user: { id: "u" }, role: "individual", loading: false });
    renderAt();
    expect(screen.getByText("DASHBOARD")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_AREA")).not.toBeInTheDocument();
  });

  it("renders children for matching role", () => {
    mockAuth.mockReturnValue({ user: { id: "u" }, role: "admin", loading: false });
    renderAt();
    expect(screen.getByText("ADMIN_AREA")).toBeInTheDocument();
  });
});
