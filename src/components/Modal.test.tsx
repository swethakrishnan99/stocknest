import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import Modal from "./Modal";

// The app re-renders in the background (sync every 30 seconds); a dialog must not steal the cursor back
function Form({ tick }: { tick: number }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  return (
    <Modal title="Add product" onClose={() => {}}>
      <span>render {tick}</span>
      <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
    </Modal>
  );
}

it("focuses the first field when it opens, and leaves the cursor alone after that", async () => {
  const { rerender } = render(<Form tick={1} />);
  expect(screen.getByLabelText("Name")).toHaveFocus();
  await userEvent.click(screen.getByLabelText("Unit"));
  await userEvent.type(screen.getByLabelText("Unit"), "ba");
  rerender(<Form tick={2} />); // parent re-renders with a new onClose
  await userEvent.keyboard("gs");
  expect(screen.getByLabelText("Unit")).toHaveFocus();
  expect(screen.getByLabelText("Unit")).toHaveValue("bags");
  expect(screen.getByLabelText("Name")).toHaveValue("");
});
