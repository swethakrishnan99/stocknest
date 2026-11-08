import { useState } from "react";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import ProductDetail from "./components/ProductDetail";
import ScanCount from "./components/ScanCount";
import StockMovements from "./components/StockMovements";
import Locations from "./components/Locations";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import { FLOUR, MOVEMENTS, LOCATIONS, newOnHand } from "./lib/sampleData";

const NO_FILTER = { query: "", loc: LOCATIONS[0] };

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [returnTo, setReturnTo] = useState("dashboard"); // where closing the scanner goes back to
  const [productFilter, setProductFilter] = useState(NO_FILTER); // set by dashboard search or a location
  // The flour product is shared by the detail and scan screens, so a scan shows up in its history
  const [flour, setFlour] = useState(FLOUR);
  const [movements, setMovements] = useState(MOVEMENTS);
  const [business, setBusiness] = useState({
    name: "Maple Street Bakery",
    currency: "CAD · Canadian dollar",
    timeZone: "Eastern Time (Toronto)",
    defaultReorder: "10",
  });

  function navigate(next, filter = NO_FILTER) {
    if (next === "scan" && screen !== "scan") setReturnTo(screen);
    setProductFilter(filter);
    setScreen(next);
    window.scrollTo(0, 0);
  }

  function saveMovement({ mode, qty, reason, note }) {
    setFlour((p) => ({
      ...p,
      onHand: newOnHand(p.onHand, mode, qty),
      history: [{ kind: mode, qty, reason, note, who: "You", when: "Just now" }, ...p.history],
    }));
    setMovements((list) => [
      { id: `m${Date.now()}`, kind: mode, qty, unit: flour.unit, product: flour.name, reason, note, loc: flour.loc, who: "You", day: "Today", time: "Just now" },
      ...list,
    ]);
  }

  if (screen === "scan") {
    return <ScanCount product={flour} onClose={() => navigate(returnTo)} onSaveMovement={saveMovement} />;
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar active={screen} onNavigate={navigate} businessName={business.name} />
      {screen === "dashboard" && (
        <Dashboard
          businessName={business.name}
          onNavigate={navigate}
          onSearch={(query) => navigate("products", { ...NO_FILTER, query })}
        />
      )}
      {screen === "products" && (
        <Products
          key={`${productFilter.query}|${productFilter.loc}`}
          initialQuery={productFilter.query}
          initialLocation={productFilter.loc}
          onNavigate={navigate}
        />
      )}
      {screen === "product" && <ProductDetail product={flour} onNavigate={navigate} onSaveMovement={saveMovement} />}
      {screen === "movements" && <StockMovements movements={movements} onNavigate={navigate} />}
      {screen === "locations" && <Locations onOpenLocation={(loc) => navigate("products", { ...NO_FILTER, loc })} />}
      {screen === "reports" && <Reports movements={movements} />}
      {screen === "settings" && <Settings business={business} onSaveBusiness={setBusiness} />}
      <BottomNav active={screen} onNavigate={navigate} />
    </div>
  );
}
