import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import InventoryProvider from "../state/InventoryProvider";
import { AuthContext, type Auth } from "../state/authContext";
import { memoryBackend } from "../lib/cloud/memoryBackend";

function fakeAuth(over: Partial<Auth> = {}): Auth {
  const backend = memoryBackend({ id: "u1", email: "rosie@example.com", name: "Rosie Lee" });
  return {
    status: "signedIn",
    enabled: true,
    backend,
    user: { id: "u1", email: "rosie@example.com", name: "Rosie Lee" },
    hasTwoStep: false,
    signUp: vi.fn(async () => ({ needsConfirmation: true })),
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    setNewPassword: vi.fn(async () => {}),
    verifyCode: vi.fn(async () => {}),
    startTwoStep: vi.fn(async () => ({ factorId: "f1", qrCode: "<svg xmlns='http://www.w3.org/2000/svg'/>", secret: "ABC123" })),
    finishTwoStep: vi.fn(async () => {}),
    turnOffTwoStep: vi.fn(async () => {}),
    ...over,
  };
}

function renderWith(auth: Auth, route = "/settings", mode: string | null = "own") {
  if (mode) localStorage.setItem("stocknest:v2:mode", JSON.stringify(mode));
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={auth}>
        <InventoryProvider>
          <App />
        </InventoryProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("account and sync", () => {
  it("is hidden when the build has no cloud", () => {
    renderWith(fakeAuth({ status: "off", enabled: false, backend: null, user: null }));
    expect(screen.queryByRole("heading", { name: "Account and sync" })).not.toBeInTheDocument();
  });

  it("offers to create an account when signed out", async () => {
    const auth = fakeAuth({ status: "signedOut", user: null });
    renderWith(auth);
    await userEvent.click(screen.getByRole("button", { name: "Create an account" }));
    const dialog = screen.getByRole("dialog", { name: "Create your account" });
    await userEvent.type(within(dialog).getByLabelText("Email"), "rosie@example.com");
    await userEvent.type(within(dialog).getByLabelText(/^Password/), "short");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create account" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("at least 8 characters");
    await userEvent.type(within(dialog).getByLabelText(/^Password/), "1234567");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create account" }));
    expect(auth.signUp).toHaveBeenCalledWith("rosie@example.com", "short1234567", "");
    expect(within(dialog).getByRole("status")).toHaveTextContent("We sent a link to rosie@example.com");
  });

  it("uploads this device's business and keeps it synced", async () => {
    const auth = fakeAuth();
    renderWith(auth, "/settings", null);
    // start a business of her own first
    await userEvent.click(screen.getByRole("button", { name: /Set up my business/ }));
    await userEvent.type(screen.getByLabelText("Business name"), "Rosie's Gifts");
    await userEvent.click(screen.getByRole("button", { name: "Start using StockNest" }));
    // signed in, so it goes to the cloud straight away
    await waitFor(() => expect(screen.getByText("Synced")).toBeInTheDocument(), { timeout: 4000 });
    const backend = auth.backend as ReturnType<typeof memoryBackend>;
    const stored = backend.businesses.get("biz-1")!;
    expect(stored.name).toBe("Rosie's Gifts");
    expect((stored.rows.get("settings/business")!.data as { name: string }).name).toBe("Rosie's Gifts");
    expect(stored.rows.has("locations/Pantry")).toBe(true);
  });

  it("asks for the two-step code before showing anything", async () => {
    const auth = fakeAuth({ status: "needsCode" });
    renderWith(auth, "/");
    expect(screen.getByRole("dialog", { name: "Enter your code" })).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("000000"), "12ab3456");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(auth.verifyCode).toHaveBeenCalledWith("123456");
  });

  it("sets up two-step login with a QR code", async () => {
    const auth = fakeAuth();
    renderWith(auth);
    const account = screen.getByRole("region", { name: "Account and sync" });
    await userEvent.click(within(account).getByRole("button", { name: "Turn on" }));
    await userEvent.click(screen.getByRole("button", { name: "Set it up" }));
    expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Code from the app"), "654321");
    await userEvent.click(within(screen.getByRole("dialog", { name: "Turn on two-step login" })).getByRole("button", { name: "Turn on" }));
    expect(auth.finishTwoStep).toHaveBeenCalledWith("f1", "654321");
  });

  it("opens the person's business on a device that only has the demo", async () => {
    const auth = fakeAuth();
    const backend = auth.backend as ReturnType<typeof memoryBackend>;
    const id = await backend.createBusiness("Green Water Aquatics", "Swetha");
    await backend.push(id, [
      { collection: "settings", id: "business", data: { name: "Green Water Aquatics", currency: "CAD · Canadian dollar", timeZone: "", defaultReorder: "5", type: "retail", categories: ["Fish"] } },
      { collection: "products", id: "FIS-0001", data: { id: "FIS-0001", name: "Neon tetra", initial: "N", tint: "#fff", cat: "Fish", loc: "Tank 1", qty: 30, unit: "fish", reorder: 10, unitCost: 1 } },
    ]);
    renderWith(auth, "/products", "demo");
    expect(await screen.findByText("Neon tetra", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByText(/demo bakery/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Green Water Aquatics").length).toBeGreaterThan(0);
  });
});
