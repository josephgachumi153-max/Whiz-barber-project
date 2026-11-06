import React, { FormEvent, useEffect, useState } from "react";
import {
  Scissors,
  LayoutDashboard,
  Users,
  ClipboardList,
  BriefcaseBusiness,
  CircleDollarSign,
  LogOut,
  Plus,
  RefreshCw,
  CheckCircle2,
  Play,
  XCircle,
  Menu,
  Eye,
  EyeOff,
  Package,
  ShieldCheck
} from "lucide-react";

type User = {
  id: string;
  username: string;
  fullName?: string;
  role: "ADMIN" | "MANAGER" | "BARBER" | "SHAMPOO_ASSISTANT";
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  totalVisits: number;
  totalSpent: string | number;
  loyaltyPoints: number;
};

type Service = {
  id: string;
  name: string;
  price: string | number;
  commissionPct?: string | number | null;
  durationMinutes: number;
};

type Barber = {
  id: string;
  name: string;
  commissionPct: string | number;
  isActive: boolean;
};

type ServiceOrderItem = {
  id: string;
  serviceId: string;
  servicePrice: string | number;
  commissionAmt: string | number;
  service: Service;
};

type Order = {
  id: string;
  status: string;
  servicePrice: string | number;
  commissionAmt: string | number;
  createdAt: string;
  customer: Customer;
  service?: Service;
  barber: Barber;
  paymentMethod: string;
  items?: ServiceOrderItem[];
};

type Sale = {
  id: string;
  amount: string | number;
  commissionAmount: string | number;
  createdAt: string;
  customer: Customer;
  service?: Service;
  barber: Barber;
  paymentMethod?: string;
  order?: { items?: ServiceOrderItem[] };
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  quantity: string | number;
  reorderLevel: string | number;
  costPrice?: string | number | null;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { username: string; fullName?: string | null; role: string } | null;
};
type Employee = {
  id: string;
  phone?: string | null;
  user: { id: string; username: string; fullName?: string | null; email?: string | null; role: User["role"]; status: string; isActive: boolean };
};

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function readResponseData(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function money(v: number | string) {
  return `KES ${Number(v).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("whiz_token") || "");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<User["role"]>("ADMIN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [available, setAvailable] = useState<Barber[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dashboard, setDashboard] = useState({
    customers: 0,
    services: 0,
    orders: 0,
    salesKes: 0
  });

  const [showCustomer, setShowCustomer] = useState(false);
  const [showService, setShowService] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showEmployee, setShowEmployee] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCommission, setServiceCommission] = useState("35");

  const [orderCustomer, setOrderCustomer] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newOrderCustomerName, setNewOrderCustomerName] = useState("");
  const [newOrderCustomerPhone, setNewOrderCustomerPhone] = useState("");
  const [orderService, setOrderService] = useState("");
  const [orderServiceIds, setOrderServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [orderBarber, setOrderBarber] = useState("");
  const [payment, setPayment] = useState("CASH");
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryUnit, setInventoryUnit] = useState("unit");
  const [inventoryQuantity, setInventoryQuantity] = useState("0");
  const [inventoryReorderLevel, setInventoryReorderLevel] = useState("0");
  const [inventoryCostPrice, setInventoryCostPrice] = useState("");
  const [inventoryManagerId, setInventoryManagerId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeUsername, setEmployeeUsername] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [employeeRole, setEmployeeRole] = useState<Exclude<User["role"], "ADMIN">>("BARBER");
  const [employeePhone, setEmployeePhone] = useState("");

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await readResponseData(response);
    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  async function load() {
    if (!token) return;
    try {
      const me = await request("/auth/me");
      const [c, s, b, a, o, t, d, i, e] = await Promise.all([
        request("/customers"),
        request("/services"),
        request("/barbers"),
        request("/barbers/available"),
        request("/orders"),
        request("/transactions"),
        request("/dashboard"),
        request("/inventory")
        , me.role === "ADMIN" ? request("/employees") : Promise.resolve([])
      ]);
      setUser(me);
      setCustomers(c);
      setServices(s);
      setBarbers(b);
      setAvailable(a);
      setOrders(o);
      setSales(t);
      setDashboard(d);
      setInventory(i);
      if (me.role === "ADMIN") {
        try {
          setAuditLogs(await request("/audit-logs"));
        } catch {
          setAuditLogs([]);
        }
      } else {
        setAuditLogs([]);
      }
      setEmployees(e);

      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    let timeout: ReturnType<typeof setTimeout>;
    const resetInactivityTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => logout(), 5 * 60 * 1000);
    };
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [token]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: accountType })
      });
      const data = await readResponseData(result);
      if (!result.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("whiz_token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("whiz_token");
    setToken("");
    setUser(null);
  }

  async function submitCustomer(e: FormEvent) {
    e.preventDefault();
    try {
      await request("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone || undefined
        })
      });
      setCustomerName("");
      setCustomerPhone("");
      setShowCustomer(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitService(e: FormEvent) {
    e.preventDefault();
    try {
      await request("/services", {
        method: "POST",
        body: JSON.stringify({
          name: serviceName,
          price: Number(servicePrice),
          commissionPct:
            serviceCommission === "" ? undefined : Number(serviceCommission),
          durationMinutes: 30
        })
      });
      setServiceName("");
      setServicePrice("");
      setShowService(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    try {
      if (!orderCustomer || !orderServiceIds.length || !orderBarber) {
        throw new Error("Choose a customer, at least one service, and a staff member");
      }
      const customer = orderCustomer === "__new__"
        ? {
            name: newOrderCustomerName,
            phone: newOrderCustomerPhone || undefined
          }
        : undefined;
      await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          ...(customer ? { newCustomer: customer } : { customerId: orderCustomer }),
          serviceIds: orderServiceIds,
          barberId: orderBarber,
          paymentMethod: payment
        })
      });
      setShowOrder(false);
      setOrderCustomer("");
      setCustomerSearch("");
      setNewOrderCustomerName("");
      setNewOrderCustomerPhone("");
      setOrderServiceIds([]);
      setServiceSearch("");
      setOrderBarber("");
      setPayment("CASH");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitInventory(e: FormEvent) {
    e.preventDefault();
    try {
      const managerId = user?.role === "ADMIN"
        ? inventoryManagerId || managerEmployees[0]?.user.id
        : undefined;
      if (user?.role === "ADMIN" && !managerId) {
        throw new Error("Choose a Manager to own this inventory item");
      }
      await request("/inventory", {
        method: "POST",
        body: JSON.stringify({
          ...(managerId ? { managerId } : {}),
          name: inventoryName,
          unit: inventoryUnit,
          quantity: Number(inventoryQuantity),
          reorderLevel: Number(inventoryReorderLevel),
          costPrice: inventoryCostPrice === "" ? undefined : Number(inventoryCostPrice)
        })
      });
      setShowInventory(false);
      setInventoryName("");
      setInventoryQuantity("0");
      setInventoryReorderLevel("0");
      setInventoryCostPrice("");
      setInventoryManagerId("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitEmployee(e: FormEvent) {
    e.preventDefault();
    try {
      await request("/employees", {
        method: "POST",
        body: JSON.stringify({ username: employeeUsername, password: employeePassword, fullName: employeeName, phone: employeePhone || undefined, role: employeeRole })
      });
      setEmployeeName(""); setEmployeeUsername(""); setEmployeePassword(""); setEmployeePhone("");
      setShowEmployee(false);
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function mutate(path: string, method = "POST", body?: unknown) {
    try {
      await request(path, {
        method,
        body: body ? JSON.stringify(body) : undefined
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeEmployee(employee: Employee) {
    const name = employee.user.fullName || employee.user.username;
    const message = employee.user.role === "MANAGER"
      ? `Delete Manager account "${name}"? Their customers, services, orders, sales, and inventory will be transferred to your Admin account.`
      : `Delete employee account "${name}"? This cannot be undone.`;
    if (!window.confirm(message)) return;
    await mutate(`/employees/${employee.user.id}`, "DELETE");
  }

  const nav = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Customers", icon: Users },
    { name: "Services", icon: BriefcaseBusiness },
    { name: "Orders", icon: ClipboardList },
    { name: "Sales", icon: CircleDollarSign },
    { name: "Inventory", icon: Package },
    ...(user?.role === "ADMIN" ? [{ name: "Admin Logs", icon: ShieldCheck }] : []),
    ...(user?.role === "ADMIN" ? [{ name: "Employees", icon: Users }] : [])
  ];

  const activeOrders = orders.filter((o) =>
    ["ASSIGNED", "IN_PROGRESS"].includes(o.status)
  );
  const title = section === "Overview" ? "Good day" : section;
  const managerEmployees = employees.filter((employee) => employee.user.role === "MANAGER" && employee.user.isActive);
  const allStaffBusy = barbers.length > 0 && available.length === 0;
  const noStaffRegistered = barbers.length === 0;
  const selectedOrderServices = services.filter((service) => orderServiceIds.includes(service.id));
  const selectedOrderBarber = available.find((barber) => barber.id === orderBarber);
  const customerMatches = customers
    .filter((customer) => `${customer.name} ${customer.phone || ""}`.toLowerCase().includes(customerSearch.trim().toLowerCase()))
    .slice(0, 8);
  const serviceMatches = services
    .filter((service) => `${service.name} ${service.price}`.toLowerCase().includes(serviceSearch.trim().toLowerCase()))
    .slice(0, 12);
  const orderTotal = selectedOrderServices.reduce((sum, service) => sum + Number(service.price), 0);
  const orderCommission = selectedOrderServices.reduce((sum, service) => {
    const pct = service.commissionPct !== null && service.commissionPct !== undefined
      ? Number(service.commissionPct)
      : Number(selectedOrderBarber?.commissionPct || 0);
    return sum + Math.round(Number(service.price) * pct) / 100;
  }, 0);

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="brand-mark">
            <Scissors size={25} />
          </div>
          <p className="eyebrow">WHIZ BARBER</p>
          <h1>
            Whiz Barber.
          </h1>
          <form onSubmit={login} className="stack">
            <label>
              Account type
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as User["role"])}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="BARBER">Barber</option>
                <option value="SHAMPOO_ASSISTANT">Shampoo Assistant</option>
              </select>
            </label>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <div className="password-control">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && <div className="alert">{error}</div>}
            <button className="primary full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Scissors size={21} />
          </div>
          <div>
            <b>whiz.</b>
            <small>BARBERSHOP OS</small>
          </div>
        </div>
        <div className="shop-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={section === n.name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setSection(n.name);
                setMobileNav(false);
              }}
            >
              <n.icon size={18} />
              <span>{n.name}</span>
              {n.name === "Orders" && activeOrders.length > 0 && (
                <em>{activeOrders.length}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">
            {(user?.fullName || user?.username || "W").slice(0, 1).toUpperCase()}
          </div>
          <div className="profile">
            <b>{user?.fullName || user?.username}</b>
            <small>{user?.role}</small>
          </div>
          <button className="icon-btn" onClick={logout} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-only"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu />
          </button>
          <div>
            <p className="eyebrow">OPERATIONS</p>
            <h2>
              {title}
              {section === "Overview" && <span className="title-dot">.</span>}
            </h2>
          </div>
          <div className="top-actions">
            <span className="live-dot"></span>
            <span className="muted">Live workspace</span>
            <button className="icon-btn" onClick={load} title="Refresh">
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        {error && (
          <div className="alert inline-alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {section === "Overview" && (
          <>
            <div className="welcome-row">
              <div>
                <h3>Your shop at a glance</h3>
                <p className="muted">
                  Track service flow, staff capacity, and revenue in one place.
                </p>
              </div>
              <button className="primary" onClick={() => setShowOrder(true)}>
                <Plus size={17} /> New service order
              </button>
            </div>
            <div className="stats-grid">
              <Stat
                label="Total sales"
                value={money(dashboard.salesKes)}
                sub="Completed transactions"
                icon={<CircleDollarSign />}
              />
              <Stat
                label="Customers"
                value={dashboard.customers}
                sub="Active customer records"
                icon={<Users />}
              />
              <Stat
                label="Services"
                value={dashboard.services}
                sub="Your service menu"
                icon={<BriefcaseBusiness />}
              />
              <Stat
                label="Orders"
                value={dashboard.orders}
                sub={`${activeOrders.length} currently active`}
                icon={<ClipboardList />}
              />
            </div>
            <div className="content-grid">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Live service queue</h3>
                    <p className="muted">Orders waiting or in progress</p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => setSection("Orders")}
                  >
                    View all →
                  </button>
                </div>
                <OrderTable
                  orders={activeOrders.slice(0, 5)}
                  user={user}
                  mutate={mutate}
                />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Staff availability</h3>
                    <p className="muted">Shared pool · on-demand allocation</p>
                  </div>
                  <span className="count-pill">{available.length} free</span>
                </div>
                <div className="barber-list">
                  {barbers.map((b) => (
                    <div className="barber-row" key={b.id}>
                      <div className="avatar barber-avatar">
                        {b.name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="barber-meta">
                        <b>{b.name}</b>
                        <small>
                          {Number(b.commissionPct)}% default commission
                        </small>
                      </div>
                      <span
                        className={
                          available.some((a) => a.id === b.id)
                            ? "status available"
                            : "status busy"
                        }
                      >
                        {available.some((a) => a.id === b.id)
                          ? "Available"
                          : "Busy"}
                      </span>
                    </div>
                  ))}
                  {barbers.length === 0 && (
                    <p className="empty">No staff registered yet.</p>
                  )}
                </div>
                <button
                  className="secondary full"
                  onClick={() => setShowOrder(true)}
                >
                  Allocate staff member
                </button>
              </section>
            </div>

            <section className="panel recent-panel">
              <div className="panel-head">
                <div>
                  <h3>Recent activity</h3>
                  <p className="muted">Latest orders across your workspace</p>
                </div>
                <span className="muted small">{orders.length} records</span>
              </div>
              <OrderTable
                orders={orders.slice(0, 6)}
                user={user}
                mutate={mutate}
              />
            </section>
          </>
        )}

        {section === "Customers" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Customer book</h3>
                <p className="muted">
                  Customers belong to the manager who created them.
                </p>
              </div>
              <button className="primary" onClick={() => setShowCustomer(true)}>
                <Plus size={17} /> Add customer
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Visits</th>
                    <th>Total spend</th>
                    <th>Loyalty</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.name}</b>
                        <small className="cell-sub">
                          {c.email || "Customer"}
                        </small>
                      </td>
                      <td>{c.phone || "—"}</td>
                      <td>{c.totalVisits}</td>
                      <td>{money(c.totalSpent)}</td>
                      <td>
                        <span className="count-pill">
                          {c.loyaltyPoints} pts
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn danger-text"
                          onClick={() => mutate(`/customers/${c.id}`, "DELETE")}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <p className="empty">No customers yet. Add your first customer.</p>
              )}
            </div>
          </section>
        )}

        {section === "Services" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Service catalogue</h3>
                <p className="muted">
                  The standard price list is ready to use. Prices and commissions are snapshotted when an order is created; add more services whenever needed.
                </p>
              </div>
              {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                <button className="primary" onClick={() => setShowService(true)}>
                  <Plus size={17} /> Add service
                </button>
              )}
            </div>
            <div className="service-grid">
              {services.map((s) => (
                <div className="service-card" key={s.id}>
                  <div className="service-icon">
                    <Scissors />
                  </div>
                  <h4>{s.name}</h4>
                  <p className="price">{money(s.price)}</p>
                  <p className="muted small">
                    {s.durationMinutes} minutes ·{" "}
                    {s.commissionPct == null
                      ? "Staff default"
                      : `${s.commissionPct}% commission`}
                  </p>
                  {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                    <button
                      className="text-btn danger-text"
                      onClick={() => mutate(`/services/${s.id}`, "DELETE")}
                    >
                      Delete service
                    </button>
                  )}
                </div>
              ))}
              {services.length === 0 && (
                <p className="empty">No services yet. Add your first service.</p>
              )}
            </div>
          </section>
        )}

        {section === "Orders" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Service orders</h3>
                <p className="muted">
                  Walk-in service lifecycle from assignment to completion.
                </p>
              </div>
              {user?.role !== "BARBER" && user?.role !== "SHAMPOO_ASSISTANT" && (
                <button className="primary" onClick={() => setShowOrder(true)}>
                  <Plus size={17} /> New order
                </button>
              )}
            </div>
            <OrderTable orders={orders} user={user} mutate={mutate} />
          </section>
        )}

        {section === "Sales" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Transactions</h3>
                <p className="muted">
                  Completed sales are recorded once and treated as immutable.
                </p>
              </div>
              <span className="count-pill">{sales.length} sales</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Staff / Barber</th>
                    <th>Payment</th>
                    <th>Commission</th>
                    <th>Sale amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td>{s.customer?.name}</td>
                      <td>{s.order?.items?.length ? s.order.items.map((item) => item.service.name).join(", ") : s.service?.name}</td>
                      <td>{s.barber?.name}</td>
                      <td>
                        <span className="tag">
                          {s.paymentMethod || "Recorded"}
                        </span>
                      </td>
                      <td>{money(s.commissionAmount)}</td>
                      <td>
                        <b>{money(s.amount)}</b>
                      </td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                <p className="empty">No completed transactions yet.</p>
              )}
            </div>
          </section>
        )}

        {section === "Inventory" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Inventory</h3>
                <p className="muted">Track stock on hand and record receipts or issues.</p>
              </div>
              {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                <button className="primary" onClick={() => setShowInventory(true)}>
                  <Plus size={17} /> Add item
                </button>
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>On hand</th><th>Reorder level</th><th>Cost</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {inventory.map((item) => {
                    const low = Number(item.quantity) <= Number(item.reorderLevel);
                    return (
                      <tr key={item.id}>
                        <td><b>{item.name}</b><small className="cell-sub">{item.sku || item.unit}</small></td>
                        <td>{Number(item.quantity).toLocaleString()} {item.unit}</td>
                        <td>{Number(item.reorderLevel).toLocaleString()} {item.unit}</td>
                        <td>{item.costPrice == null ? "—" : money(item.costPrice)}</td>
                        <td><span className={low ? "status busy" : "status available"}>{low ? "Low stock" : "In stock"}</span></td>
                        <td className="row-actions">
                          {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                            <>
                              <button className="text-btn" onClick={() => {
                                const value = window.prompt(`Quantity to add to ${item.name}`, "1");
                                if (value) mutate(`/inventory/${item.id}/adjust`, "POST", { quantity: Number(value), type: "RECEIPT", reason: "Stock received" });
                              }}>Receive</button>
                              <button className="text-btn" onClick={() => {
                                const value = window.prompt(`Quantity to issue from ${item.name}`, "1");
                                if (value) mutate(`/inventory/${item.id}/adjust`, "POST", { quantity: -Math.abs(Number(value)), type: "ISSUE", reason: "Stock issued" });
                              }}>Issue</button>
                              <button className="text-btn danger-text" onClick={() => mutate(`/inventory/${item.id}`, "DELETE")}>Deactivate</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {inventory.length === 0 && <p className="empty">No inventory items yet.</p>}
            </div>
          </section>
        )}

        {section === "Admin Logs" && user?.role === "ADMIN" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div>
                <h3>Admin audit history</h3>
                <p className="muted">A persistent record of sign-ins and administrative changes.</p>
              </div>
              <span className="count-pill">{auditLogs.length} events</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th></tr></thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.actor?.fullName || log.actor?.username || "System"}</td>
                      <td><span className="tag">{log.action}</span></td>
                      <td>{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && <p className="empty">No audit events yet.</p>}
            </div>
          </section>
        )}
        {section === "Employees" && user?.role === "ADMIN" && (
          <section className="panel page-panel">
            <div className="panel-head">
              <div><h3>Employee accounts</h3><p className="muted">Manage managers, barbers and support staff.</p></div>
              <button className="primary" onClick={() => setShowEmployee(true)}><Plus size={17} /> Add employee</button>
            </div>
            <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Username</th><th>Role</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>
              {employees.map((employee) => <tr key={employee.id}><td><b>{employee.user.fullName || employee.user.username}</b><small className="cell-sub">{employee.user.email || "No email"}</small></td><td>{employee.user.username}</td><td><span className="tag">{employee.user.role}</span></td><td>{employee.phone || "—"}</td><td><span className={employee.user.isActive ? "status available" : "status busy"}>{employee.user.isActive ? "Active" : "Suspended"}</span></td><td><button className="text-btn danger-text" onClick={() => removeEmployee(employee)}>Delete</button></td></tr>)}
            </tbody></table>{employees.length === 0 && <p className="empty">No employee accounts yet.</p>}</div>
          </section>
        )}

        <footer className="footer">
          <span>WHIZ BARBERSHOP MANAGEMENT SYSTEM</span>
          <span>Single location · Walk-in operations</span>
        </footer>
      </main>

      {showCustomer && (
        <Modal title="Add a customer" close={() => setShowCustomer(false)}>
          <form className="stack" onSubmit={submitCustomer}>
            <label>
              Full name
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Phone number
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07xx xxx xxx"
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowCustomer(false)}
              >
                Cancel
              </button>
              <button className="primary">Save customer</button>
            </div>
          </form>
        </Modal>
      )}

      {showService && (
        <Modal title="Add a service" close={() => setShowService(false)}>
          <form className="stack" onSubmit={submitService}>
            <label>
              Service name
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Price (KES)
              <input
                type="number"
                min="1"
                step="0.01"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                required
              />
            </label>
            <label>
              Commission percentage
              <input
                type="number"
                min="0"
                max="100"
                value={serviceCommission}
                onChange={(e) => setServiceCommission(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowService(false)}
              >
                Cancel
              </button>
              <button className="primary">Save service</button>
            </div>
          </form>
        </Modal>
      )}

      {showInventory && (
        <Modal title="Add inventory item" close={() => setShowInventory(false)}>
          <form className="stack" onSubmit={submitInventory}>
            <label>Item name<input value={inventoryName} onChange={(e) => setInventoryName(e.target.value)} required autoFocus /></label>
            {user?.role === "ADMIN" && (
              <label>
                Manager owner
                <select
                  value={inventoryManagerId || managerEmployees[0]?.user.id || ""}
                  onChange={(e) => setInventoryManagerId(e.target.value)}
                  required
                >
                  <option value="">Select Manager</option>
                  {managerEmployees.map((employee) => (
                    <option value={employee.user.id} key={employee.user.id}>
                      {employee.user.fullName || employee.user.username}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>Unit<input value={inventoryUnit} onChange={(e) => setInventoryUnit(e.target.value)} required /></label>
            <label>Opening quantity<input type="number" min="0" step="0.01" value={inventoryQuantity} onChange={(e) => setInventoryQuantity(e.target.value)} required /></label>
            <label>Reorder level<input type="number" min="0" step="0.01" value={inventoryReorderLevel} onChange={(e) => setInventoryReorderLevel(e.target.value)} required /></label>
            <label>Cost price (KES)<input type="number" min="0" step="0.01" value={inventoryCostPrice} onChange={(e) => setInventoryCostPrice(e.target.value)} /></label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowInventory(false)}>Cancel</button>
              <button className="primary" disabled={user?.role === "ADMIN" && !managerEmployees.length}>Save item</button>
            </div>
          </form>
        </Modal>
      )}

      {showOrder && (
        <Modal title="Create service order" close={() => setShowOrder(false)}>
          <form className="stack" onSubmit={submitOrder}>
            <p className="muted small">
              Search for an enrolled customer or add a new one, select one or more
              services, then assign staff and payment method. Prices and commission
              are frozen at creation.
            </p>
            <label>
              Customer name or phone
              <input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setOrderCustomer("");
                }}
                placeholder="Search enrolled customers"
                required
                autoFocus
              />
            </label>
            {!orderCustomer && customerSearch.trim() && (
              <div className="choice-list">
                {customerMatches.map((customer) => (
                  <button
                    type="button"
                    className="choice-row"
                    key={customer.id}
                    onClick={() => {
                      setOrderCustomer(customer.id);
                      setCustomerSearch(customer.name);
                    }}
                  >
                    <span><b>{customer.name}</b><small>{customer.phone || "No phone number"}</small></span>
                    <span className="muted small">Enrolled</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="choice-row new-choice"
                  onClick={() => {
                    setOrderCustomer("__new__");
                    setNewOrderCustomerName(customerSearch.trim());
                  }}
                >
                  <span><b>+ Add new customer</b><small>{customerSearch.trim()}</small></span>
                  <span className="muted small">Save on order</span>
                </button>
              </div>
            )}
            {orderCustomer === "__new__" && (
              <>
                <label>
                  New customer name
                  <input
                    value={newOrderCustomerName}
                    onChange={(e) => setNewOrderCustomerName(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Phone number
                  <input
                    value={newOrderCustomerPhone}
                    onChange={(e) => setNewOrderCustomerPhone(e.target.value)}
                    placeholder="07xx xxx xxx"
                  />
                </label>
              </>
            )}
            <label>
              Search services
              <input
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search by service name"
              />
            </label>
            <div className="choice-list service-choices">
              {serviceMatches.map((service) => (
                <label className="choice-row" key={service.id}>
                  <span className="choice-main">
                    <input
                      type="checkbox"
                      checked={orderServiceIds.includes(service.id)}
                      onChange={() => setOrderServiceIds((current) => current.includes(service.id)
                        ? current.filter((id) => id !== service.id)
                        : [...current, service.id])}
                    />
                    <span><b>{service.name}</b><small>{money(service.price)}{service.commissionPct !== null && service.commissionPct !== undefined ? ` · ${service.commissionPct}% commission` : " · staff commission"}</small></span>
                  </span>
                  <span className="muted small">{service.durationMinutes} min</span>
                </label>
              ))}
              {!serviceMatches.length && <p className="empty">No matching services.</p>}
            </div>
            {selectedOrderServices.length > 0 && (
              <div className="order-summary">
                <div><span>{selectedOrderServices.length} service{selectedOrderServices.length === 1 ? "" : "s"} selected</span><b>{money(orderTotal)}</b></div>
                <small>Estimated barber commission: {money(orderCommission)}</small>
              </div>
            )}
            <label className="legacy-order-service">
              Service
              <select
                value={orderService}
                onChange={(e) => setOrderService(e.target.value)}
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name} — {money(s.price)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Personnel
              <select
                value={orderBarber}
                onChange={(e) => setOrderBarber(e.target.value)}
                required
              >
                <option value="">Select staff</option>
                {available.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment method
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
              </select>
            </label>
            {available.length > 0 && (
              <div className="availability-note">
                Available personnel: {available.map((staff) => staff.name).join(", ")}. Manager-controlled availability updates when an order is started, completed, or cancelled.
              </div>
            )}
            {allStaffBusy && (
              <div className="alert">
                All staff members are occupied. A new order cannot be assigned until the Manager completes or cancels an active order.
              </div>
            )}
            {noStaffRegistered && (
              <div className="alert">
                No active personnel are registered. An Admin must create a Barber or Shampoo Assistant before assigning an order.
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowOrder(false)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={
                  !available.length || !orderCustomer || !orderServiceIds.length || !services.length
                }
              >
                Create order
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEmployee && (
        <Modal title="Add employee account" close={() => setShowEmployee(false)}>
          <form className="stack" onSubmit={submitEmployee}>
            <label>Full name<input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required autoFocus /></label>
            <label>Username<input value={employeeUsername} onChange={(e) => setEmployeeUsername(e.target.value)} minLength={3} required /></label>
            <label>Temporary password<div className="password-control"><input type={showEmployeePassword ? "text" : "password"} value={employeePassword} onChange={(e) => setEmployeePassword(e.target.value)} minLength={10} required autoComplete="new-password" /><button type="button" className="password-toggle" onClick={() => setShowEmployeePassword((visible) => !visible)} aria-label={showEmployeePassword ? "Hide employee password" : "Show employee password"} title={showEmployeePassword ? "Hide employee password" : "Show employee password"}>{showEmployeePassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <label>Phone<input value={employeePhone} onChange={(e) => setEmployeePhone(e.target.value)} /></label>
            <label>Role<select value={employeeRole} onChange={(e) => setEmployeeRole(e.target.value as typeof employeeRole)}><option value="MANAGER">Manager</option><option value="BARBER">Barber</option><option value="SHAMPOO_ASSISTANT">Shampoo Assistant</option></select></label>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowEmployee(false)}>Cancel</button><button className="primary">Create employee</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function Modal({
  title,
  close,
  children
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={close}>
            <XCircle size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OrderTable({
  orders,
  user,
  mutate
}: {
  orders: Order[];
  user: User | null;
  mutate: (path: string, method?: string, body?: unknown) => Promise<void>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer / Service</th>
            <th>Staff</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <b>{o.customer?.name || "Customer"}</b>
                <small className="cell-sub">
                  {o.items?.length ? o.items.map((item) => item.service.name).join(", ") : o.service?.name || "Service"} ·{" "}
                  {new Date(o.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </small>
              </td>
              <td>{o.barber?.name || "Staff"}</td>
              <td>
                <span className={`status-tag ${o.status.toLowerCase()}`}>
                  {o.status.replace("_", " ")}
                </span>
              </td>
              <td>
                <b>{money(o.servicePrice)}</b>
              </td>
              <td>
                <div className="row-actions">
                  {o.status === "ASSIGNED" &&
                    (user?.role === "ADMIN" || user?.role === "BARBER" || user?.role === "SHAMPOO_ASSISTANT") && (
                      <button
                        className="mini-action"
                        onClick={() => mutate(`/orders/${o.id}/start`)}
                      >
                        <Play size={13} /> Start
                      </button>
                    )}
                  {o.status === "IN_PROGRESS" &&
                    (user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "BARBER" || user?.role === "SHAMPOO_ASSISTANT") && (
                      <button
                        className="mini-action complete"
                        onClick={() => mutate(`/orders/${o.id}/complete`)}
                      >
                        <CheckCircle2 size={13} /> Complete
                      </button>
                    )}
                  {["ASSIGNED", "IN_PROGRESS"].includes(o.status) &&
                    (user?.role === "ADMIN" || user?.role === "MANAGER") && (
                      <button
                        className="mini-action cancel"
                        onClick={() =>
                          mutate(`/orders/${o.id}/cancel`, "POST", {
                            reason: "Cancelled from dashboard"
                          })
                        }
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                  {["COMPLETED", "CANCELLED"].includes(o.status) && (
                    <span className="muted small">Closed</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <p className="empty">Nothing here yet. New orders will appear here.</p>
      )}
    </div>
  );
}
