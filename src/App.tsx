import { useCallback, useEffect, useState, type ComponentProps } from "react";
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
import ReceiveOrder from "./components/ReceiveOrder";
import Toast, { type ToastProps } from "./components/Toast";
import { reorderItem } from "./lib/inventory";
import { useInventory } from "./state/inventoryContext";
import { ALL_LOCATIONS, DEFAULT_SCAN_ID } from "./lib/sampleData";
import type { NavFilter, Navigate as NavigateFn, Product, PurchaseOrder, ReorderItem, Screen } from "./types";

const PATHS: Partial<Record<Screen, string>> = {
  dashboard: "/",
  products: "/products",
  movements: "/movements",
  locations: "/locations",
  reports: "/reports",
  settings: "/settings",
  scan: "/scan",
};

// Which nav item to highlight for the current address
function screenFor(pathname: string): Screen {
  if (pathname.startsWith("/products/")) return "product";
  const match = Object.entries(PATHS).find(([, path]) => path !== "/" && pathname.startsWith(path));
  return match ? (match[0] as Screen) : "dashboard";
}

interface ProductsRouteProps {
  newProductId: string | null;
  onAddProduct: () => void;
  onNavigate: NavigateFn;
}

function ProductsRoute({ newProductId, onAddProduct, onNavigate }: ProductsRouteProps) {
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

type ProductRouteProps = Omit<ComponentProps<typeof ProductDetail>, "productId">;

function ProductRoute(props: ProductRouteProps) {
  const { id = "" } = useParams();
  return <ProductDetail key={id} productId={id} {...props} />;
}

function ScanRoute() {
  const [params] = useSearchParams();
  const { state } = useLocation() as { state: { from?: string } | null };
  const navigate = useNavigate();
  const id = params.get("id") ?? DEFAULT_SCAN_ID;
  return (
    <ScanCount
      key={id}
      productId={id}
      onClose={() => navigate(state?.from ?? "/")}
      onSwitchProduct={(next: string) => navigate(`/scan?id=${encodeURIComponent(next)}`, { replace: true, state })}
    />
  );
}

export default function App() {
  const { business, nextPo, addProduct, placeOrder, products, deleteProduct, restoreProduct, rawProduct } = useInventory();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [adding, setAdding] = useState(false); // Add product pop-up
  const [newProductId, setNewProductId] = useState<string | null>(null); // highlighted in Products after adding
  const [reordering, setReordering] = useState<ReorderItem | null>(null); // item shown in the Reorder pop-up
  const [receiving, setReceiving] = useState<string | null>(null); // product id whose order is being received
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const screen = screenFor(location.pathname);

  // New page, start at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  /** Screens call onNavigate("products", { status: "low" }) etc.; this turns it into an address. */
  const navigate: NavigateFn = (next: Screen, filter: NavFilter = {}) => {
    setNewProductId(null);
    if (next === "product") return routerNavigate(`/products/${encodeURIComponent(filter.id ?? "")}`);
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
  };

  function handleAdd(product: Product) {
    addProduct(product);
    setAdding(false);
    navigate("products");
    setNewProductId(product.id);
  }

  function handleOrder(order: PurchaseOrder) {
    placeOrder(order);
    setReordering(null);
    setToast({ message: `PO #${order.po} placed: ${order.qty} ${order.unit} of ${order.item}.` });
  }

  // Reorder from a product page uses the same pop-up as the dashboard
  function reorderProduct(id: string) {
    const product = products.find((p) => p.id === id);
    if (product) setReordering(reorderItem(product));
  }

  function handleDelete(id: string) {
    const snapshot = rawProduct(id);
    if (!snapshot) return;
    deleteProduct(id);
    navigate("products");
    setToast({
      message: `Deleted ${snapshot.name}.`,
      action: "Undo",
      onAction: () => {
        restoreProduct(snapshot);
        setToast({ message: `${snapshot.name} is back.` });
      },
    });
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
              onReceive={setReceiving}
              onSearch={(query: string) => navigate("products", { query })}
            />
          }
        />
        <Route
          path="/products"
          element={<ProductsRoute newProductId={newProductId} onAddProduct={() => setAdding(true)} onNavigate={navigate} />}
        />
        <Route
          path="/products/:id"
          element={<ProductRoute onNavigate={navigate} onReorder={reorderProduct} onReceive={setReceiving} onDelete={handleDelete} />}
        />
        <Route path="/movements" element={<StockMovements onNavigate={navigate} />} />
        <Route path="/locations" element={<Locations onOpenLocation={(loc: string) => navigate("products", { loc })} />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav active={screen} onNavigate={navigate} />
      {reordering && (
        <ReorderDialog item={reordering} poNumber={nextPo} onOrder={handleOrder} onClose={() => setReordering(null)} />
      )}
      {adding && <AddProduct onAdd={handleAdd} onClose={() => setAdding(false)} />}
      {receiving && (
        <ReceiveOrder
          productId={receiving}
          onClose={() => setReceiving(null)}
          onDone={(message: string) => {
            setReceiving(null);
            setToast({ message });
          }}
        />
      )}
      {toast && <Toast {...toast} onClose={closeToast} />}
    </div>
  );
}
