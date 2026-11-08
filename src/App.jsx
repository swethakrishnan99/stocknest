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
import AddProduct from "./components/AddProduct";
import ReorderDialog from "./components/ReorderDialog";
import { FLOUR, MOVEMENTS, LOCATIONS, PRODUCTS, SUMMARY, FIRST_PO_NUMBER, newOnHand } from "./lib/sampleData";

const NO_FILTER = { query: "", loc: LOCATIONS[0], status: "all" };

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [returnTo, setReturnTo] = useState("dashboard"); // where closing the scanner goes back to
  const [productFilter, setProductFilter] = useState(NO_FILTER); // set by dashboard search or a location
  // The flour product is shared by the detail and scan screens, so a scan shows up in its history
  const [flour, setFlour] = useState(FLOUR);
  const [movements, setMovements] = useState(MOVEMENTS);
  const [products, setProducts] = useState(PRODUCTS);
  const [adding, setAdding] = useState(false); // Add product pop-up
  const [newProductId, setNewProductId] = useState(null); // highlighted in Products after adding
  const [orders, setOrders] = useState({}); // purchase orders by product name
  const [reordering, setReordering] = useState(null); // item shown in the Reorder pop-up
  const [business, setBusiness] = useState({
    name: "Maple Street Bakery",
    currency: "CAD · Canadian dollar",
    timeZone: "Eastern Time (Toronto)",
    defaultReorder: "10",
  });

  function navigate(next, filter = {}) {
    if (next === "scan" && screen !== "scan") setReturnTo(screen);
    setProductFilter({ ...NO_FILTER, ...filter });
    setNewProductId(null);
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

  function addProduct(product) {
    setProducts((list) => [product, ...list]);
    setAdding(false);
    navigate("products");
    setNewProductId(product.id);
  }

  const nextPo = FIRST_PO_NUMBER + Object.keys(orders).length;

  function placeOrder(order) {
    setOrders((o) => ({ ...o, [order.item]: order }));
    setReordering(null);
  }

  // Sample data lists only some of the 248 products, so count additions on top of the summary
  const productTotal = SUMMARY.products + products.length - PRODUCTS.length;

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
          orders={orders}
          onAddProduct={() => setAdding(true)}
          onReorder={setReordering}
          onSearch={(query) => navigate("products", { query })}
        />
      )}
      {screen === "products" && (
        <Products
          key={`${productFilter.query}|${productFilter.loc}|${productFilter.status}`}
          initialQuery={productFilter.query}
          initialLocation={productFilter.loc}
          initialStatus={productFilter.status}
          products={products}
          total={productTotal}
          newProductId={newProductId}
          onAddProduct={() => setAdding(true)}
          onNavigate={navigate}
        />
      )}
      {screen === "product" && <ProductDetail product={flour} onNavigate={navigate} onSaveMovement={saveMovement} />}
      {screen === "movements" && <StockMovements movements={movements} onNavigate={navigate} />}
      {screen === "locations" && <Locations onOpenLocation={(loc) => navigate("products", { loc })} />}
      {screen === "reports" && <Reports movements={movements} products={products} />}
      {screen === "settings" && <Settings business={business} onSaveBusiness={setBusiness} />}
      <BottomNav active={screen} onNavigate={navigate} />
      {reordering && (
        <ReorderDialog item={reordering} poNumber={nextPo} onOrder={placeOrder} onClose={() => setReordering(null)} />
      )}
      {adding && <AddProduct products={products} onAdd={addProduct} onClose={() => setAdding(false)} />}
    </div>
  );
}
