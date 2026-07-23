import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { IntakeWizard } from "@/pages/intake/IntakeWizard";
import { CheckoutPage } from "@/pages/checkout/CheckoutPage";
import { InventoryListPage } from "@/pages/inventory/InventoryListPage";
import { InventoryDetailPage } from "@/pages/inventory/InventoryDetailPage";
import { ProductsListPage } from "@/pages/products/ProductsListPage";
import { ProductDetailPage } from "@/pages/products/ProductDetailPage";
import { LocationsListPage } from "@/pages/locations/LocationsListPage";
import { LocationFormPage } from "@/pages/locations/LocationFormPage";
import { LocationPrintPage } from "@/pages/locations/LocationPrintPage";
import { UsersAdminPage } from "@/pages/users/UsersAdminPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan/intake" element={<IntakeWizard />} />
          <Route path="/scan/checkout" element={<CheckoutPage />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/locations" element={<LocationsListPage />} />
          <Route path="/locations/new" element={<LocationFormPage />} />
          <Route path="/locations/print" element={<LocationPrintPage />} />
          <Route path="/locations/:id" element={<LocationFormPage />} />
          <Route element={<RequireAuth adminOnly />}>
            <Route path="/users" element={<UsersAdminPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
