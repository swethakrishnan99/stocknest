import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReceiveOrder from "./ReceiveOrder";
import { renderApp } from "../test/render";
import { useInventory } from "../state/inventoryContext";
import { useEffect } from "react";

// Places an order before showing the pop-up, like the Dashboard would
function WithOrder({ onDone }: { onDone: (message: string) => void }) {
  const { placeOrder, orders, products } = useInventory();
  useEffect(() => {
    placeOrder({ po: 1046, productId: "ING-0031", item: "Unsalted butter, 454 g", supplier: "Dairyland Foods", qty: 20, unit: "blocks", due: "2026-11-08", total: 139.8, note: "" });
  }, [placeOrder]);
  if (!orders["ING-0031"]) return null;
  return (
    <>
      <p>On hand: {products.find((p) => p.id === "ING-0031")?.qty}</p>
      <ReceiveOrder productId="ING-0031" onDone={onDone} onClose={() => {}} />
    </>
  );
}

describe("ReceiveOrder", () => {
  it("receives the ordered amount by default", async () => {
    const onDone = vi.fn();
    renderApp(<WithOrder onDone={onDone} />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("On hand goes from 4 to 24 blocks.");
    await userEvent.click(screen.getByRole("button", { name: "Mark as received" }));
    expect(onDone).toHaveBeenCalledWith("Received 20 blocks of Unsalted butter, 454 g (PO #1046). On hand is now 24.");
  });

  it("warns about a short delivery", async () => {
    renderApp(<WithOrder onDone={() => {}} />);
    await screen.findByRole("dialog");
    const less = screen.getByRole("button", { name: "Decrease quantity" });
    await userEvent.click(less);
    await userEvent.click(less);
    expect(screen.getByText("2 short of the order.")).toBeInTheDocument();
  });
});
