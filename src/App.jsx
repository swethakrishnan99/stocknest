import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
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
import { useInventory } from "./state/inventoryContext";
import { ALL_LOCATIONS, DEFAULT_SCAN_ID } from "./lib/sampleData";

const PATHS = {
  dashboard: "/",
  products: "/products",
  movements: "/movements",
  locations: "/locations",
  reports: "/reports",
  settings: "/settings",
  scan: "/scan",
};

// Which nav item to highlight for the current address
function screenFor(pathname) {
  if (pathname.startsWith("/products/")) return "product";
  const match = Object.entries(PATHS).find(([, path]) => path !== "/" && pathname.startsWith(path));
  return match ? match[0] : "dashboard";
}

function ProductsRoute({ newProductId, onAddProduct, onNavigate }) {
  const [params] = useSearchParams();
  return (
    <Products
      key={params.toString()} // a new filter from another screen starts the page fresh
      initialQuery={params.get("q") ?? ""}
      initialLocation={params.get("loc") ?? ALL_LOCATIONS}
      initialStatus={params.get("status") ?? "all"}
      newProductId={newProductId}
      onAddProduct={onAddProduct}
      onNavigate={onNavigate}
    />
  );
}

function ProductRoute({ onNavigate }) {
  const { id } = useParams();
  return <ProductDetail key={id} productId={id} onNavigate={onNavigate} />;
}

function ScanRoute() {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  return <ScanCount productId={params.get("id") ?? DEFAULT_SCAN_ID} onClose={() => navigate(state?.from ?? "/")} />;
}

export default function App() {
  const { business, nextPo, addProduct, placeOrder } = useInventory();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [adding, setAdding] = useState(false); // Add product pop-up
  const [newProductId, setNewProductId] = useState(null); // highlighted in Products after adding
  const [reordering, setReordering] = useState(null); // item shown in the Reorder pop-up

  const screen = screenFor(location.pathname);

  // New page, start at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  /** Screens call onNavigate("products", { status: "low" }) etc.; this turns it into an address. */
  function navigate(next, filter = {}) {
    setNewProductId(null);
    if (next === "product") return routerNavigate(`/products/${encodeURIComponent(filter.id)}`);
    if (next === "scan") {
      const query = filter.id ? `?id=${encodeURIComponent(filter.id)}` : "";
      return routerNavigate(`/scan${query}`, { state: { from: location.pathname + location.search } });
    }
    const params = new URLSearchParams();
    if (filter.query) params.set("q", filter.query);
    if (filter.loc && filter.loc !== ALL_LOCATIONS) params.set("loc", filter.loc);
    if (filter.status && filter.status !== "all") params.set("status", filter.status);
    const query = params.toString();
    routerNavigate(`${PATHS[next] ?? "/"}${query ? `?${query}` : ""}`);
  }

  function handleAdd(product) {
    addProduct(product);
    setAdding(false);
    navigate("products");
    setNewProductId(product.id);
  }

  function handleOrder(order) {
    placeOrder(order);
    setReordering(null);
  }

  if (screen === "scan") return <ScanRoute />;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar active={screen} onNavigate={navigate} businessName={business.name} />
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              onNavigate={navigate}
              onAddProduct={() => setAdding(true)}
              onReorder={setReordering}
              onSearch={(query) => navigate("products", { query })}
            />
          }
        />
        <Route
          path="/products"
          element={<ProductsRoute newProductId={newProductId} onAddProduct={() => setAdding(true)} onNavigate={navigate} />}
        />
        <Route path="/products/:id" element={<ProductRoute onNavigate={navigate} />} />
        <Route path="/movements" element={<StockMovements onNavigate={navigate} />} />
        <Route path="/locations" element={<Locations onOpenLocation={(loc) => navigate("products", { loc })} />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav active={screen} onNavigate={navigate} />
      {reordering && (
        <ReorderDialog item={reordering} poNumber={nextPo} onOrder={handleOrder} onClose={() => setReordering(null)} />
      )}
      {adding && <AddProduct onAdd={handleAdd} onClose={() => setAdding(false)} />}
    </div>
  );
}
