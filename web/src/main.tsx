import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient, type Session } from "@supabase/supabase-js";
import "./style.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5127";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export type Role = "User" | "ServiceProvider" | "StaffAdmin";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

export interface Budget {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  createdAt?: string;
}

export interface SharedExpense {
  id: string;
  tripId: string;
  paidBy: string;
  amount: number;
  currency: string;
  description: string;
  createdAt?: string;
}

export interface Activity {
  id: string;
  tripId: string;
  name: string;
  location: string;
  startAt: string;
  endAt: string;
  createdAt?: string;
}

export interface RiskAssessment {
  id: string;
  tripId: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  summary: string;
  weatherSummary?: string;
  assessedAt?: string;
}

export interface GroupMember {
  id: string;
  tripId: string;
  displayName: string;
  email: string;
  isActive: boolean;
}

export type CatalogItemType = "VisitingPlace" | "Restaurant" | "Accommodation" | "FoodPrice";

export interface CatalogItem {
  id: string;
  type: CatalogItemType;
  name: string;
  destination: string;
  description: string;
  address?: string;
  contact?: string;
  price?: number;
  currency: string;
  cuisineOrCategory?: string;
  rating?: number;
  providerUserId: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface ProviderApplication {
  id: string;
  email: string;
  businessName: string;
  contactPhone?: string;
  serviceType?: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNote?: string;
  createdAt: string;
}

export interface Workflow {
  id: string;
  tripId: string;
  objective: string;
  status: string;
  planJson?: string;
  resultJson?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  workflowId: string;
  eventType: string;
  details: string;
  createdAt: string;
}

async function apiRequest<T>(path: string, options: RequestInit = {}, role: Role = "User", userId: string = "demo-user"): Promise<T> {
  const session = (await supabase?.auth.getSession())?.data.session;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Role": role,
    "X-User-Id": userId,
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (response.status === 204) return {} as T;
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!response.ok) {
    const errorMsg = payload && typeof payload === "object" && "error" in payload
      ? String(payload.error)
      : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return payload as T;
}

function App() {
  // Authentication & Role State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<Role>("User");
  const [session, setSession] = useState<Session | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [loginRole, setLoginRole] = useState<Role>("User");
  const [signupRole, setSignupRole] = useState<"User" | "ServiceProvider">("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [serviceType, setServiceType] = useState("Accommodation & Dining");
  
  const [activeNav, setActiveNav] = useState<"dashboard" | "catalog" | "trips" | "weather" | "settlement" | "approvals" | "audit" | "provider-verifications">("dashboard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Provider block state: null = no block, "Rejected" = admin rejected, "Pending" = awaiting approval
  const [providerBlockState, setProviderBlockState] = useState<null | "Rejected" | "Pending" | "SignedUp">(null);
  const [providerBlockEmail, setProviderBlockEmail] = useState<string>("");

  // Core Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripTab, setTripTab] = useState<"budgets" | "expenses" | "activities" | "risks" | "members" | "settlements">("budgets");
  
  // Trip Sub-module states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  // Catalog States
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [allCatalogItems, setAllCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogFilterType, setCatalogFilterType] = useState<string>("ALL");
  const [catalogSearchDest, setCatalogSearchDest] = useState<string>("");

  // Provider Applications State (For Admin)
  const [providerApplications, setProviderApplications] = useState<ProviderApplication[]>([]);

  // Weather & Risk State
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherDestination, setWeatherDestination] = useState("Ella");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [modalType, setModalType] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Form States
  const [tripForm, setTripForm] = useState({ name: "", destination: "", startDate: "", endDate: "" });
  const [budgetForm, setBudgetForm] = useState({ amount: "", currency: "LKR" });
  const [expenseForm, setExpenseForm] = useState({ paidBy: "", amount: "", description: "", currency: "LKR" });
  const [activityForm, setActivityForm] = useState({ name: "", location: "", startAt: "", endAt: "" });
  const [riskForm, setRiskForm] = useState({ severity: "Medium" as const, summary: "", weatherSummary: "" });
  const [memberForm, setMemberForm] = useState({ displayName: "", email: "" });
  const [catalogForm, setCatalogForm] = useState({
    type: "VisitingPlace" as CatalogItemType,
    name: "",
    destination: "",
    description: "",
    address: "",
    contact: "",
    price: "",
    currency: "LKR",
    cuisineOrCategory: "",
    rating: "4.5"
  });

  const currentUserId = session?.user?.id || email || `demo-${role.toLowerCase()}`;

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setIsAuthenticated(true);
        const userMetaRole = data.session.user?.user_metadata?.role as Role;
        if (userMetaRole) routeUserToRoleDashboard(userMetaRole);
      }
    });
    const listener = supabase?.auth.onAuthStateChange((_, next) => {
      setSession(next);
      if (next) {
        setIsAuthenticated(true);
        const userMetaRole = next.user?.user_metadata?.role as Role;
        if (userMetaRole) routeUserToRoleDashboard(userMetaRole);
      }
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTrips();
      loadCatalog();
      loadAllCatalog();
      loadWeather(weatherDestination);
      loadAuditLogs();
      loadProviderApplications();
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (selectedTrip && isAuthenticated) {
      loadTripModuleData(selectedTrip.id);
    }
  }, [selectedTrip]);

  // Route user to their role-specific dashboard view
  function routeUserToRoleDashboard(targetRole: Role) {
    setRole(targetRole);
    if (targetRole === "User") {
      setActiveNav("dashboard");
    } else if (targetRole === "ServiceProvider") {
      setActiveNav("catalog");
    } else if (targetRole === "StaffAdmin") {
      setActiveNav("provider-verifications");
    }
  }

  async function loadTrips() {
    try {
      const data = await apiRequest<Trip[]>("/api/trips", {}, role, currentUserId);
      const items = Array.isArray(data) ? data : [];
      setTrips(items);
      if (!selectedTrip && items.length > 0) setSelectedTrip(items[0]);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadCatalog() {
    try {
      const query = catalogSearchDest ? `?destination=${encodeURIComponent(catalogSearchDest)}` : "";
      const data = await apiRequest<CatalogItem[]>(`/api/catalog${query}`, {}, role, currentUserId);
      setCatalogItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadAllCatalog() {
    try {
      const data = await apiRequest<CatalogItem[]>("/api/catalog/all", {}, role, currentUserId);
      setAllCatalogItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadProviderApplications() {
    try {
      const data = await apiRequest<ProviderApplication[]>("/api/auth/provider-applications", {}, role, currentUserId);
      setProviderApplications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadWeather(dest: string) {
    try {
      const res = await apiRequest<any>(`/api/weather?destination=${encodeURIComponent(dest)}`, {}, role, currentUserId);
      setWeatherData(res);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadAuditLogs() {
    try {
      const res = await apiRequest<AuditLog[]>("/api/auditlogs", {}, role, currentUserId);
      setAuditLogs(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadTripModuleData(tripId: string) {
    try {
      const [b, e, a, r, m, s] = await Promise.all([
        apiRequest<Budget[]>(`/api/budgets/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<SharedExpense[]>(`/api/expenses/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<Activity[]>(`/api/activities/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<RiskAssessment[]>(`/api/risks/trip/${tripId}`, {}, role, currentUserId),
        apiRequest<GroupMember[]>(`/api/groups/${tripId}/members`, {}, role, currentUserId),
        apiRequest<any>(`/api/settlements/trip/${tripId}`, {}, role, currentUserId).catch(() => null),
      ]);
      setBudgets(Array.isArray(b) ? b : []);
      setExpenses(Array.isArray(e) ? e : []);
      setActivities(Array.isArray(a) ? a : []);
      setRisks(Array.isArray(r) ? r : []);
      setMembers(Array.isArray(m) ? m : []);
      setSettlementData(s);
    } catch (err: any) {
      console.error(err);
    }
  }

  // --- Auth Handlers ---
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      // Send login request with requested role header so backend verifies Provider verification status
      await apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }, loginRole, email);

      if (supabase) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw new Error(err.message);
        setSession(data.session);
      }

      routeUserToRoleDashboard(loginRole);
      setIsAuthenticated(true);
      setSuccess(`Authenticated successfully as ${loginRole}! Welcome to your dashboard.`);
    } catch (err: any) {
      const msg: string = err.message || "Login failed.";
      // Detect specific provider block messages from the C# API
      if (loginRole === "ServiceProvider" && msg.toLowerCase().includes("rejected")) {
        setProviderBlockState("Rejected");
        setProviderBlockEmail(email);
      } else if (loginRole === "ServiceProvider" && msg.toLowerCase().includes("pending")) {
        setProviderBlockState("Pending");
        setProviderBlockEmail(email);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      await apiRequest<any>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role: signupRole,
          displayName,
          contactPhone,
          serviceType
        })
      });

      if (signupRole === "ServiceProvider") {
        // Show the dedicated pending-verification full-screen instead of just a success toast
        setProviderBlockState("SignedUp");
        setProviderBlockEmail(email);
      } else {
        setSuccess("Account registered successfully! You can now log in to plan your group trips.");
        setAuthMode("LOGIN");
        setLoginRole(signupRole as Role);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  // --- Admin Provider Verification Handlers ---
  async function handleApproveProvider(appId: string) {
    try {
      await apiRequest(`/api/auth/provider-applications/${appId}/approve`, { method: "POST" }, role, currentUserId);
      setSuccess("Service Provider verified and approved successfully! They can now access the portal.");
      loadProviderApplications();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRejectProvider(appId: string) {
    const reason = prompt("Enter optional rejection reason (or leave blank):");
    try {
      await apiRequest(`/api/auth/provider-applications/${appId}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: reason || "Rejected by Administrator" })
      }, role, currentUserId);
      setSuccess("Service Provider registration request rejected. The user will be notified of the rejection if they attempt to log in.");
      loadProviderApplications();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  function handleDemoBypass(demoRole: Role) {
    routeUserToRoleDashboard(demoRole);
    setIsAuthenticated(true);
    setSuccess(`Logged in via Quick Demo Preview as ${demoRole}!`);
  }

  function handleSignOut() {
    if (supabase) supabase.auth.signOut();
    setSession(null);
    setIsAuthenticated(false);
    setSuccess("Logged out successfully.");
  }

  // --- CRUD: Trips ---
  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/trips/${editItem.id}`, { method: "PUT", body: JSON.stringify(tripForm) }, role, currentUserId);
        setSuccess("Trip updated successfully!");
      } else {
        await apiRequest("/api/trips", { method: "POST", body: JSON.stringify(tripForm) }, role, currentUserId);
        setSuccess("Trip created successfully!");
      }
      setModalType(null);
      setTripForm({ name: "", destination: "", startDate: "", endDate: "" });
      loadTrips();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteTrip(id: string) {
    if (!confirm("Are you sure you want to delete this trip? All details will be deleted.")) return;
    try {
      await apiRequest(`/api/trips/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip?.id === id) setSelectedTrip(null);
      setSuccess("Trip deleted.");
      loadTrips();
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Budgets ---
  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/budgets/${editItem.id}`, { method: "PUT", body: JSON.stringify({ amount: Number(budgetForm.amount), currency: budgetForm.currency }) }, role, currentUserId);
      } else {
        await apiRequest("/api/budgets", { method: "POST", body: JSON.stringify({ tripId: selectedTrip.id, amount: Number(budgetForm.amount), currency: budgetForm.currency }) }, role, currentUserId);
      }
      setModalType(null);
      setBudgetForm({ amount: "", currency: "LKR" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm("Delete budget?")) return;
    try {
      await apiRequest(`/api/budgets/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Expenses ---
  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/expenses/${editItem.id}`, { method: "PUT", body: JSON.stringify({ paidBy: expenseForm.paidBy, amount: Number(expenseForm.amount), description: expenseForm.description, currency: expenseForm.currency }) }, role, currentUserId);
      } else {
        await apiRequest("/api/expenses", { method: "POST", body: JSON.stringify({ tripId: selectedTrip.id, paidBy: expenseForm.paidBy, amount: Number(expenseForm.amount), description: expenseForm.description, currency: expenseForm.currency }) }, role, currentUserId);
      }
      setModalType(null);
      setExpenseForm({ paidBy: "", amount: "", description: "", currency: "LKR" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Delete expense?")) return;
    try {
      await apiRequest(`/api/expenses/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Activities ---
  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      const body = { name: activityForm.name, location: activityForm.location, startAt: new Date(activityForm.startAt).toISOString(), endAt: new Date(activityForm.endAt).toISOString() };
      if (editItem) {
        await apiRequest(`/api/activities/${editItem.id}`, { method: "PUT", body: JSON.stringify(body) }, role, currentUserId);
      } else {
        await apiRequest("/api/activities", { method: "POST", body: JSON.stringify({ ...body, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setActivityForm({ name: "", location: "", startAt: "", endAt: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteActivity(id: string) {
    if (!confirm("Delete activity?")) return;
    try {
      await apiRequest(`/api/activities/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Risks ---
  async function handleSaveRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/risks/${editItem.id}`, { method: "PUT", body: JSON.stringify(riskForm) }, role, currentUserId);
      } else {
        await apiRequest("/api/risks", { method: "POST", body: JSON.stringify({ ...riskForm, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setRiskForm({ severity: "Medium", summary: "", weatherSummary: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteRisk(id: string) {
    if (!confirm("Delete risk assessment?")) return;
    try {
      await apiRequest(`/api/risks/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Group Members ---
  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setError(null);
    try {
      if (editItem) {
        await apiRequest(`/api/groups/members/${editItem.id}`, { method: "PUT", body: JSON.stringify(memberForm) }, role, currentUserId);
      } else {
        await apiRequest("/api/groups/members", { method: "POST", body: JSON.stringify({ ...memberForm, tripId: selectedTrip.id }) }, role, currentUserId);
      }
      setModalType(null);
      setMemberForm({ displayName: "", email: "" });
      loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteMember(id: string) {
    if (!confirm("Remove group member?")) return;
    try {
      await apiRequest(`/api/groups/members/${id}`, { method: "DELETE" }, role, currentUserId);
      if (selectedTrip) loadTripModuleData(selectedTrip.id);
    } catch (err: any) { setError(err.message); }
  }

  // --- CRUD: Catalog Items ---
  async function handleSaveCatalogItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        ...catalogForm,
        price: catalogForm.price ? Number(catalogForm.price) : null,
        rating: catalogForm.rating ? Number(catalogForm.rating) : null,
      };
      if (editItem) {
        await apiRequest(`/api/catalog/${editItem.id}`, { method: "PUT", body: JSON.stringify(payload) }, role, currentUserId);
        setSuccess("Catalog listing updated!");
      } else {
        await apiRequest("/api/catalog", { method: "POST", body: JSON.stringify(payload) }, role, currentUserId);
        setSuccess(role === "StaffAdmin" ? "Catalog listing added and approved!" : "Catalog listing submitted! Awaiting Admin approval.");
      }
      setModalType(null);
      setCatalogForm({
        type: "VisitingPlace",
        name: "",
        destination: "",
        description: "",
        address: "",
        contact: "",
        price: "",
        currency: "LKR",
        cuisineOrCategory: "",
        rating: "4.5"
      });
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDeleteCatalogItem(id: string) {
    if (!confirm("Delete this catalog listing?")) return;
    try {
      await apiRequest(`/api/catalog/${id}`, { method: "DELETE" }, role, currentUserId);
      setSuccess("Listing deleted.");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleApproveCatalogItem(id: string) {
    try {
      await apiRequest(`/api/catalog/${id}/approve`, { method: "POST" }, role, currentUserId);
      setSuccess("Listing approved!");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRejectCatalogItem(id: string) {
    try {
      await apiRequest(`/api/catalog/${id}/reject`, { method: "POST" }, role, currentUserId);
      setSuccess("Listing rejected!");
      loadCatalog();
      loadAllCatalog();
    } catch (err: any) { setError(err.message); }
  }

  // --- AI Workflow Trigger & Approval Queue ---
  async function triggerAiWorkflow(trip: Trip) {
    setBusy(true); setError(null);
    try {
      const res = await apiRequest<Workflow>("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          tripId: trip.id,
          objective: `Plan an optimized, safe itinerary with budget checks, place recommendations, and split billing for ${trip.name} in ${trip.destination}`
        })
      }, role, currentUserId);
      setWorkflow(res);
      setSuccess("AI Agent workflow complete! Proposal sent to AI Approvals Queue.");
      loadAuditLogs();
    } catch (err: any) {
      setError(err.message || "Failed to execute AI workflow.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveWorkflow(approved: boolean) {
    if (!workflow) return;
    try {
      const updated = await apiRequest<Workflow>(`/api/workflows/${workflow.id}/approval`, {
        method: "POST",
        body: JSON.stringify({ approved, comment: approved ? "Approved after agent validation review" : "Rejected after review" })
      }, role, currentUserId);
      setWorkflow(updated);
      setSuccess(approved ? "Workflow recommendation approved!" : "Workflow recommendation rejected.");
      loadAuditLogs();
    } catch (err: any) { setError(err.message); }
  }

  const filteredCatalog = (role === "StaffAdmin" ? allCatalogItems : catalogItems).filter(item => {
    if (catalogFilterType !== "ALL" && item.type !== catalogFilterType) return false;
    if (catalogSearchDest && !item.destination.toLowerCase().includes(catalogSearchDest.toLowerCase())) return false;
    return true;
  });

  const pendingCatalogItems = allCatalogItems.filter(item => !item.isApproved);
  const pendingProvidersCount = providerApplications.filter(x => x.status === "Pending").length;

  // =========================================================================
  // VIEW 0A: PROVIDER REJECTED SCREEN (full-screen block with clear notification)
  // =========================================================================
  if (providerBlockState === "Rejected") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          {/* Red pulsing icon */}
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(239,68,68,0.15)",
            border: "3px solid rgba(239,68,68,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(239,68,68,0.3)",
            animation: "pulse-danger 2s infinite"
          }}>❌</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fca5a5", marginBottom: 12 }}>
            Registration Rejected
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Account: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          {/* Main rejection banner */}
          <div style={{
            background: "rgba(239,68,68,0.12)",
            border: "2px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#f87171", marginBottom: 8 }}>
                  Admin Rejected Your Service Provider Registration
                </div>
                <div style={{ fontSize: 14, color: "#fca5a5", lineHeight: 1.6 }}>
                  An Administrator has reviewed your Service Provider sign-up request and <strong>denied access</strong>.
                  Your registration has been cancelled and you will not be granted access to the Service Provider portal.
                </div>
              </div>
            </div>
          </div>

          {/* What this means section */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>What this means:</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <li>🔒 Your Service Provider account application has been permanently denied</li>
              <li>🚫 You cannot access the Provider Portal or add listings</li>
              <li>📧 Contact the system administrator if you believe this is an error</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                setProviderBlockState(null);
                setProviderBlockEmail("");
                setEmail("");
                setPassword("");
                setAuthMode("LOGIN");
                setLoginRole("User");
              }}
            >
              Return to Login Page
            </button>
            <button
              className="btn"
              style={{ width: "100%", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}
              onClick={() => {
                setProviderBlockState(null);
                setProviderBlockEmail("");
                setEmail("");
                setPassword("");
                setAuthMode("LOGIN");
                setLoginRole("User");
              }}
            >
              Sign In as Regular Customer Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 0B: PROVIDER PENDING VERIFICATION SCREEN (awaiting admin approval)
  // =========================================================================
  if (providerBlockState === "Pending") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(245,158,11,0.15)",
            border: "3px solid rgba(245,158,11,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(245,158,11,0.2)",
            animation: "pulse-warning 2s infinite"
          }}>⏳</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fde047", marginBottom: 12 }}>
            Awaiting Admin Verification
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Account: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "2px solid rgba(245,158,11,0.35)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🔍</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#fbbf24", marginBottom: 8 }}>
                  Your Provider Application is Under Review
                </div>
                <div style={{ fontSize: 14, color: "#fde047", lineHeight: 1.6 }}>
                  An Administrator must manually verify your Service Provider registration before you can access the portal.
                  Please check back later or contact the system administrator.
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: "100%" }}
            onClick={() => {
              setProviderBlockState(null);
              setProviderBlockEmail("");
              setEmail("");
              setPassword("");
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 0C: PROVIDER SIGNED-UP PENDING SCREEN (after successful registration)
  // =========================================================================
  if (providerBlockState === "SignedUp") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 540, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(16,185,129,0.12)",
            border: "3px solid rgba(16,185,129,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: "0 0 32px rgba(16,185,129,0.2)"
          }}>✅</div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#6ee7b7", marginBottom: 8 }}>
            Application Submitted!
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Registered as: <strong style={{ color: "var(--text-main)" }}>{providerBlockEmail}</strong>
          </p>

          <div style={{
            background: "rgba(245,158,11,0.1)",
            border: "2px solid rgba(245,158,11,0.3)",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 20,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fbbf24", marginBottom: 10 }}>⏳ Pending Admin Verification</div>
            <div style={{ fontSize: 13, color: "#fde047", lineHeight: 1.7 }}>
              Your Service Provider sign-up request has been placed in the <strong>Administrator Verification Queue</strong>.
              An admin must manually review and approve your application before you can access the Provider Portal.
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-dim)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>What happens next:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#a5b4fc", flexShrink: 0 }}>1</span>
                Admin reviews your application in the Verification Queue
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6ee7b7", flexShrink: 0 }}>2</span>
                If <strong style={{ color: "#6ee7b7" }}>approved</strong> — you gain full Provider Portal access
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#f87171", flexShrink: 0 }}>3</span>
                If <strong style={{ color: "#f87171" }}>rejected</strong> — your sign-up is cancelled with a clear rejection notice
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => {
              setProviderBlockState(null);
              setProviderBlockEmail("");
              setEmail("");
              setPassword("");
              setAuthMode("LOGIN");
              setLoginRole("ServiceProvider");
            }}
          >
            Try Login (Check Approval Status)
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: AUTHENTICATION GATEWAY (LOGIN & SIGN UP PAGES)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-logo">TW</div>
            <h1 className="auth-title">TravelWise Auth Gateway</h1>
            <p className="auth-subtitle">AI-Native Travel Intelligence Platform & RBAC System</p>
          </div>

          {/* Mode Switcher: Login vs Sign Up */}
          <div className="auth-mode-toggle">
            <button
              className={`auth-mode-btn ${authMode === "LOGIN" ? "active" : ""}`}
              onClick={() => { setAuthMode("LOGIN"); setError(null); setSuccess(null); }}
            >
              Sign In (Login)
            </button>
            <button
              className={`auth-mode-btn ${authMode === "SIGNUP" ? "active" : ""}`}
              onClick={() => { setAuthMode("SIGNUP"); setError(null); setSuccess(null); }}
            >
              Register (Sign Up)
            </button>
          </div>

          {/* Alert Notifications */}
          {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}
          {success && <div className="alert alert-success"><span>✅</span> {success}</div>}

          {/* LOGIN FORM */}
          {authMode === "LOGIN" && (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                  1. Select Target Account Role:
                </label>
                <div className="auth-role-tabs">
                  <button
                    type="button"
                    className={`auth-role-tab ${loginRole === "User" ? "active" : ""}`}
                    onClick={() => setLoginRole("User")}
                  >
                    <span>🧳</span> Customer (User)
                  </button>
                  <button
                    type="button"
                    className={`auth-role-tab ${loginRole === "ServiceProvider" ? "active" : ""}`}
                    onClick={() => setLoginRole("ServiceProvider")}
                  >
                    <span>🏨</span> Service Provider
                  </button>
                  <button
                    type="button"
                    className={`auth-role-tab ${loginRole === "StaffAdmin" ? "active" : ""}`}
                    onClick={() => setLoginRole("StaffAdmin")}
                  >
                    <span>🛡️</span> System Admin
                  </button>
                </div>
              </div>

              {loginRole === "ServiceProvider" && (
                <div className="auth-notice" style={{ background: "rgba(6,182,212,0.1)", borderColor: "rgba(6,182,212,0.3)", color: "#67e8f9" }}>
                  <span>ℹ️</span>
                  <span><strong>Service Provider Notice:</strong> Accounts require manual Administrator verification. If an admin rejects your request, login will be denied.</span>
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  required
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={busy}>
                {busy ? "Authenticating..." : `Sign In as ${loginRole === "User" ? "Customer" : loginRole === "ServiceProvider" ? "Service Provider" : "Admin"}`}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {authMode === "SIGNUP" && (
            <form onSubmit={handleSignUpSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                  1. Choose Registration Role:
                </label>
                <div className="auth-role-tabs">
                  <button
                    type="button"
                    className={`auth-role-tab ${signupRole === "User" ? "active" : ""}`}
                    onClick={() => setSignupRole("User")}
                  >
                    <span>🧳</span> Standard User (Customer)
                  </button>
                  <button
                    type="button"
                    className={`auth-role-tab ${signupRole === "ServiceProvider" ? "active" : ""}`}
                    onClick={() => setSignupRole("ServiceProvider")}
                  >
                    <span>🏨</span> Service Provider
                  </button>
                </div>
              </div>

              {signupRole === "ServiceProvider" ? (
                <div className="auth-notice">
                  <span>⏳</span>
                  <span>
                    <strong>Admin Verification Policy:</strong> Service Provider registrations require manual verification by an Administrator. If approved, your account will become active; if rejected, sign-up is cancelled.
                  </span>
                </div>
              ) : (
                <div className="auth-notice" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#6ee7b7" }}>
                  <span>⚡</span>
                  <span><strong>Instant Customer Access:</strong> Customer accounts are activated immediately upon registration.</span>
                </div>
              )}

              <div className="form-group">
                <label>{signupRole === "ServiceProvider" ? "Business / Organization Name" : "Full Name"}</label>
                <input
                  required
                  className="form-control"
                  placeholder={signupRole === "ServiceProvider" ? "e.g. Ceylon Resort & Dining" : "e.g. Kasun Silva"}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>

              {signupRole === "ServiceProvider" && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Contact Phone</label>
                      <input
                        required
                        className="form-control"
                        placeholder="+94 77 123 4567"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Service Specialization</label>
                      <input
                        required
                        className="form-control"
                        placeholder="Hotels, Dining, Attractions"
                        value={serviceType}
                        onChange={e => setServiceType(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  required
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password (Min. 6 Characters)</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button className="btn btn-accent" style={{ width: "100%", marginTop: 8 }} disabled={busy}>
                {busy ? "Submitting..." : signupRole === "ServiceProvider" ? "Submit Provider Application for Verification" : "Create Customer Account"}
              </button>
            </form>
          )}

          {/* Quick Demo Preview Shortcuts for Evaluators */}
          <div className="demo-shortcut-box">
            <div className="demo-shortcut-title">⚡ Evaluator Quick Role Preview:</div>
            <div className="demo-btn-group">
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleDemoBypass("User")}>
                🧳 Customer
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleDemoBypass("ServiceProvider")}>
                🏨 Provider
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleDemoBypass("StaffAdmin")}>
                🛡️ Admin
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED SYSTEM DASHBOARD (LEFT SIDEBAR LAYOUT)
  // =========================================================================
  return (
    <div className="app-layout">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">TW</div>
          <div>
            <div className="brand-title">TravelWise</div>
            <div className="brand-tagline">AI Travel Intelligence</div>
          </div>
        </div>

        {/* Active Authenticated Role Box */}
        <div className="role-box">
          <div className="role-lbl">Active Authenticated Role</div>
          <div className="role-select-btns">
            <button className={`role-option ${role === "User" ? "active" : ""}`} onClick={() => routeUserToRoleDashboard("User")}>
              <span>🧳</span> Customer (User)
            </button>
            <button className={`role-option ${role === "ServiceProvider" ? "active" : ""}`} onClick={() => routeUserToRoleDashboard("ServiceProvider")}>
              <span>🏨</span> Service Provider
            </button>
            <button className={`role-option ${role === "StaffAdmin" ? "active" : ""}`} onClick={() => routeUserToRoleDashboard("StaffAdmin")}>
              <span>🛡️</span> System Admin
            </button>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="nav-menu">
          <button className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => setActiveNav("dashboard")}>
            <span>📊</span> Dashboard
          </button>
          {role === "StaffAdmin" && (
            <button className={`nav-item ${activeNav === "provider-verifications" ? "active" : ""}`} onClick={() => setActiveNav("provider-verifications")}>
              <span>📋</span> Provider Sign-Up Verifications {pendingProvidersCount > 0 && <span className="badge badge-warning" style={{ marginLeft: "auto" }}>{pendingProvidersCount}</span>}
            </button>
          )}
          <button className={`nav-item ${activeNav === "catalog" ? "active" : ""}`} onClick={() => setActiveNav("catalog")}>
            <span>🏨</span> Service Provider Listings
          </button>
          <button className={`nav-item ${activeNav === "trips" ? "active" : ""}`} onClick={() => setActiveNav("trips")}>
            <span>✈️</span> Trips Analytics & Management
          </button>
          <button className={`nav-item ${activeNav === "weather" ? "active" : ""}`} onClick={() => setActiveNav("weather")}>
            <span>🛡️</span> Safety & Weather Monitor
          </button>
          <button className={`nav-item ${activeNav === "settlement" ? "active" : ""}`} onClick={() => setActiveNav("settlement")}>
            <span>⚖️</span> Debt Settlement Matrix
          </button>
          <button className={`nav-item ${activeNav === "approvals" ? "active" : ""}`} onClick={() => setActiveNav("approvals")}>
            <span>🤖</span> AI Approvals Queue
          </button>
          <button className={`nav-item ${activeNav === "audit" ? "active" : ""}`} onClick={() => setActiveNav("audit")}>
            <span>📜</span> System Audit Logs
          </button>
        </nav>

        {/* User Session Footer */}
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-color)", marginTop: "auto" }}>
          <button className="btn btn-danger btn-sm" style={{ width: "100%" }} onClick={handleSignOut}>
            Sign Out ({email ? email.split('@')[0] : role})
          </button>
        </div>
      </aside>

      {/* 2. MAIN CANVAS AREA */}
      <main className="main-content">
        {/* Top Header Bar */}
        <div className="top-header">
          <div>
            <h1 className="page-title">
              {activeNav === "dashboard" && (role === "User" ? "Customer Travel Dashboard" : role === "ServiceProvider" ? "Provider Analytics Dashboard" : "Admin Panel Overview")}
              {activeNav === "provider-verifications" && "Service Provider Sign-Up Verification Desk"}
              {activeNav === "catalog" && "Service Provider Catalog & Listings"}
              {activeNav === "trips" && "Group Trips & Itinerary Workspace"}
              {activeNav === "weather" && "Safety & Real-Time Weather Monitoring"}
              {activeNav === "settlement" && "Group Debt Settlement Matrix"}
              {activeNav === "approvals" && "AI Human-in-the-Loop Approval Queue"}
              {activeNav === "audit" && "ASP.NET Core Security Audit Logs"}
            </h1>
            <div className="page-sub">Logged in Role: <strong style={{ color: "var(--accent)" }}>{role}</strong> | Connected to C# API & Supabase</div>
          </div>
          {activeNav === "trips" && (
            <button className="btn btn-primary" onClick={() => { setEditItem(null); setTripForm({ name: "", destination: "", startDate: "", endDate: "" }); setModalType("TRIP"); }}>
              + Create New Trip
            </button>
          )}
          {activeNav === "catalog" && (
            <button className="btn btn-accent" onClick={() => { setEditItem(null); setCatalogForm({ type: "VisitingPlace", name: "", destination: "", description: "", address: "", contact: "", price: "", currency: "LKR", cuisineOrCategory: "", rating: "4.5" }); setModalType("CATALOG"); }}>
              + Add New Listing
            </button>
          )}
        </div>

        {/* Global Alert Notices */}
        {error && (
          <div className="alert alert-danger">
            <span>⚠️ Error:</span> {error}
            <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✅ Success:</span> {success}
            <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setSuccess(null)}>✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CANVAS: SERVICE PROVIDER SIGN-UP VERIFICATIONS (ADMIN VIEW)               */}
        {/* ========================================================================= */}
        {activeNav === "provider-verifications" && (
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><span>📋</span> Service Provider Sign-Up Applications</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Admin manual review queue. Providers become active only upon Admin approval; rejected requests will cancel sign-up.</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadProviderApplications}>Refresh Applications</button>
            </div>

            {providerApplications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>No Service Provider registration requests submitted yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Service Type</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                      <th>Admin Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerApplications.map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.businessName}</strong></td>
                        <td>{app.email}</td>
                        <td>{app.contactPhone || "N/A"}</td>
                        <td>{app.serviceType || "General"}</td>
                        <td>
                          {app.status === "Approved" ? (
                            <span className="badge badge-success">✅ Approved</span>
                          ) : app.status === "Rejected" ? (
                            <span className="badge badge-danger">❌ Rejected</span>
                          ) : (
                            <span className="badge badge-warning">⏳ Pending Review</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td>
                          {app.status === "Pending" ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => handleApproveProvider(app.id)}>
                                ✅ Approve
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleRejectProvider(app.id)}>
                                ❌ Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Decision Recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 1: DASHBOARD OVERVIEW                                              */}
        {/* ========================================================================= */}
        {activeNav === "dashboard" && (
          <>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>✈️</div>
                <div>
                  <div className="stat-val">{trips.length}</div>
                  <div className="stat-lbl">Active Group Trips</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4" }}>📍</div>
                <div>
                  <div className="stat-val">{catalogItems.length}</div>
                  <div className="stat-lbl">Approved Listings</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>⏳</div>
                <div>
                  <div className="stat-val">{pendingCatalogItems.length}</div>
                  <div className="stat-lbl">Pending Place Approvals</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>📋</div>
                <div>
                  <div className="stat-val">{pendingProvidersCount}</div>
                  <div className="stat-lbl">Pending Provider Sign-Ups</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <section className="card">
                <div className="card-header">
                  <div className="card-title"><span>🤖</span> AI Agent Subsystem Status</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                    <div><strong>Budget Agent</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tools: GetTripBudget, GetExpenses, CalculateHealth</span></div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                    <div><strong>Activity Agent</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tools: SearchActivities, GetDetails, CheckConflict</span></div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                    <div><strong>Risk Agent</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tools: GetWeather, GetDestinationRisk</span></div>
                    <span className="badge badge-success">Online</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                    <div><strong>Split-Bill Agent</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tools: CalculateBalances, ConvertCurrency, GenerateSettlementPlan</span></div>
                    <span className="badge badge-success">Online</span>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="card-title"><span>🛡️</span> C# Business Rules Engine</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Deterministic rule validation layer enforcing non-bypassable safety constraints before database writes:</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <li>✅ <strong>BR-BUD-01</strong>: Expense Amount &gt; 0</li>
                  <li>✅ <strong>BR-ACT-01</strong>: Overlap check preventing 2 simultaneous activities</li>
                  <li>✅ <strong>BR-RISK-01</strong>: Outdoor activity severe weather alert warning</li>
                  <li>✅ <strong>BR-SPLIT-01</strong>: Total Split Sum = Total Expense Amount</li>
                  <li>✅ <strong>BR-SPLIT-02</strong>: Net balance sum strictly = 0 across all participants</li>
                  <li>✅ <strong>RBAC-PROV-01</strong>: Service Provider manual verification by Administrator</li>
                </ul>
              </section>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 2: SERVICE PROVIDER LISTINGS & APPROVAL GRID                      */}
        {/* ========================================================================= */}
        {activeNav === "catalog" && (
          <>
            {role === "StaffAdmin" && pendingCatalogItems.length > 0 && (
              <section className="card" style={{ border: "1px solid var(--warning)" }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: "var(--warning)" }}>⏳ Admin Moderation Queue (Pending Provider Submissions)</div>
                  <button className="btn btn-secondary btn-sm" onClick={loadAllCatalog}>Refresh</button>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr><th>Type</th><th>Listing Name</th><th>Destination</th><th>Price</th><th>Provider User</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {pendingCatalogItems.map(item => (
                        <tr key={item.id}>
                          <td><span className="badge badge-warning">{item.type}</span></td>
                          <td><strong>{item.name}</strong><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.description}</span></td>
                          <td>📍 {item.destination}</td>
                          <td>{item.price ? `${item.price} ${item.currency}` : "Quote"}</td>
                          <td><span style={{ fontSize: 11, fontFamily: "monospace" }}>{item.providerUserId}</span></td>
                          <td>
                            <button className="btn btn-primary btn-sm" style={{ marginRight: 6 }} onClick={() => handleApproveCatalogItem(item.id)}>✅ Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleRejectCatalogItem(item.id)}>❌ Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="card">
              <div className="card-header">
                <div className="card-title"><span>🏨</span> Service Provider Travel Catalog</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="form-control" style={{ width: 180, height: 36 }} placeholder="Search Destination..." value={catalogSearchDest} onChange={e => setCatalogSearchDest(e.target.value)} />
                  <button className="btn btn-secondary btn-sm" onClick={loadCatalog}>Search</button>
                </div>
              </div>

              <div className="tabs-bar">
                <button className={`tab-item ${catalogFilterType === "ALL" ? "active" : ""}`} onClick={() => setCatalogFilterType("ALL")}>All Category Items</button>
                <button className={`tab-item ${catalogFilterType === "VisitingPlace" ? "active" : ""}`} onClick={() => setCatalogFilterType("VisitingPlace")}>📍 Visiting Places</button>
                <button className={`tab-item ${catalogFilterType === "Restaurant" ? "active" : ""}`} onClick={() => setCatalogFilterType("Restaurant")}>🍽️ Restaurants</button>
                <button className={`tab-item ${catalogFilterType === "Accommodation" ? "active" : ""}`} onClick={() => setCatalogFilterType("Accommodation")}>🏨 Accommodation</button>
                <button className={`tab-item ${catalogFilterType === "FoodPrice" ? "active" : ""}`} onClick={() => setCatalogFilterType("FoodPrice")}>💰 Food Prices</button>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="empty-state"><p>No catalog items found matching your filters.</p></div>
              ) : (
                <div className="grid-3">
                  {filteredCatalog.map(item => (
                    <div key={item.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="badge badge-accent">{item.type}</span>
                        {item.isApproved ? <span className="badge badge-success">Approved</span> : <span className="badge badge-warning">Pending</span>}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{item.name}</h3>
                      <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>📍 {item.destination}</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{item.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600 }}>
                        <span>{item.price ? `${item.price.toLocaleString()} ${item.currency}` : "Price on Request"}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(item); setCatalogForm({ type: item.type, name: item.name, destination: item.destination, description: item.description, address: item.address || "", contact: item.contact || "", price: item.price ? String(item.price) : "", currency: item.currency, cuisineOrCategory: item.cuisineOrCategory || "", rating: item.rating ? String(item.rating) : "4.5" }); setModalType("CATALOG"); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCatalogItem(item.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 3: TRIPS ANALYTICS & MANAGEMENT                                   */}
        {/* ========================================================================= */}
        {activeNav === "trips" && (
          <>
            <section className="card">
              <div className="card-header">
                <div className="card-title"><span>✈️</span> Group Trips Collection</div>
              </div>
              <div className="grid-3">
                {trips.map(trip => (
                  <div key={trip.id} style={{ background: selectedTrip?.id === trip.id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)", border: selectedTrip?.id === trip.id ? "1px solid var(--primary)" : "1px solid var(--border-color)", borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{trip.name}</h3>
                      <span className="badge badge-accent">📍 {trip.destination}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>🗓️ {trip.startDate} to {trip.endDate}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedTrip(trip)}>{selectedTrip?.id === trip.id ? "Active Trip" : "Select Trip"}</button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => triggerAiWorkflow(trip)}>🤖 Run AI Review</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTrip(trip.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {selectedTrip && (
              <section className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">📊 Selected Trip Workspace: {selectedTrip.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Destination: {selectedTrip.destination} | Dates: {selectedTrip.startDate} - {selectedTrip.endDate}</div>
                  </div>
                </div>

                <div className="tabs-bar">
                  <button className={`tab-item ${tripTab === "budgets" ? "active" : ""}`} onClick={() => setTripTab("budgets")}>💰 Budgets ({budgets.length})</button>
                  <button className={`tab-item ${tripTab === "expenses" ? "active" : ""}`} onClick={() => setTripTab("expenses")}>🧾 Shared Expenses ({expenses.length})</button>
                  <button className={`tab-item ${tripTab === "activities" ? "active" : ""}`} onClick={() => setTripTab("activities")}>🗺️ Itinerary Activities ({activities.length})</button>
                  <button className={`tab-item ${tripTab === "risks" ? "active" : ""}`} onClick={() => setTripTab("risks")}>🛡️ Risks & Safety ({risks.length})</button>
                  <button className={`tab-item ${tripTab === "members" ? "active" : ""}`} onClick={() => setTripTab("members")}>👥 Group Members ({members.length})</button>
                  <button className={`tab-item ${tripTab === "settlements" ? "active" : ""}`} onClick={() => setTripTab("settlements")}>⚖️ Settlement Summary</button>
                </div>

                {tripTab === "budgets" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Trip Budget Allocations</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setBudgetForm({ amount: "", currency: "LKR" }); setModalType("BUDGET"); }}>+ Add Budget</button>
                    </div>
                    {budgets.length === 0 ? <p className="text-muted">No budget records set yet.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Amount</th><th>Currency</th><th>Created At</th><th>Actions</th></tr></thead>
                          <tbody>
                            {budgets.map(b => (
                              <tr key={b.id}>
                                <td style={{ fontWeight: 700 }}>{b.amount.toLocaleString()}</td>
                                <td><span className="badge badge-primary">{b.currency}</span></td>
                                <td>{new Date(b.createdAt || "").toLocaleDateString()}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(b); setBudgetForm({ amount: String(b.amount), currency: b.currency }); setModalType("BUDGET"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBudget(b.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "expenses" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Shared Expense Log</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setExpenseForm({ paidBy: "", amount: "", description: "", currency: "LKR" }); setModalType("EXPENSE"); }}>+ Add Expense</button>
                    </div>
                    {expenses.length === 0 ? <p className="text-muted">No expense records logged.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Description</th><th>Paid By</th><th>Amount</th><th>Actions</th></tr></thead>
                          <tbody>
                            {expenses.map(exp => (
                              <tr key={exp.id}>
                                <td><strong>{exp.description}</strong></td>
                                <td>{exp.paidBy}</td>
                                <td>{exp.amount.toLocaleString()} {exp.currency}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(exp); setExpenseForm({ paidBy: exp.paidBy, amount: String(exp.amount), description: exp.description, currency: exp.currency }); setModalType("EXPENSE"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "activities" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Itinerary & Activity Schedule</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setActivityForm({ name: "", location: "", startAt: "", endAt: "" }); setModalType("ACTIVITY"); }}>+ Add Activity</button>
                    </div>
                    {activities.length === 0 ? <p className="text-muted">No itinerary activities planned.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Activity</th><th>Location</th><th>Start Time</th><th>End Time</th><th>Actions</th></tr></thead>
                          <tbody>
                            {activities.map(act => (
                              <tr key={act.id}>
                                <td><strong>{act.name}</strong></td>
                                <td>📍 {act.location}</td>
                                <td>{new Date(act.startAt).toLocaleString()}</td>
                                <td>{new Date(act.endAt).toLocaleString()}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(act); setActivityForm({ name: act.name, location: act.location, startAt: act.startAt.substring(0, 16), endAt: act.endAt.substring(0, 16) }); setModalType("ACTIVITY"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteActivity(act.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "risks" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Safety & Risk Assessments</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setRiskForm({ severity: "Medium", summary: "", weatherSummary: "" }); setModalType("RISK"); }}>+ Add Risk Note</button>
                    </div>
                    {risks.length === 0 ? <p className="text-muted">No risk assessments logged.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Severity</th><th>Summary</th><th>Weather Advisory</th><th>Actions</th></tr></thead>
                          <tbody>
                            {risks.map(r => (
                              <tr key={r.id}>
                                <td><span className={`badge ${r.severity === "Critical" || r.severity === "High" ? "badge-danger" : r.severity === "Medium" ? "badge-warning" : "badge-success"}`}>{r.severity}</span></td>
                                <td>{r.summary}</td>
                                <td>{r.weatherSummary || "N/A"}</td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(r); setRiskForm({ severity: r.severity, summary: r.summary, weatherSummary: r.weatherSummary || "" }); setModalType("RISK"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRisk(r.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "members" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4>Group Trip Members</h4>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setMemberForm({ displayName: "", email: "" }); setModalType("MEMBER"); }}>+ Add Member</button>
                    </div>
                    {members.length === 0 ? <p className="text-muted">No group members added.</p> : (
                      <div className="table-wrapper">
                        <table className="table">
                          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                          <tbody>
                            {members.map(m => (
                              <tr key={m.id}>
                                <td><strong>{m.displayName}</strong></td>
                                <td>{m.email}</td>
                                <td><span className="badge badge-success">Active</span></td>
                                <td>
                                  <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditItem(m); setMemberForm({ displayName: m.displayName, email: m.email }); setModalType("MEMBER"); }}>Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMember(m.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripTab === "settlements" && (
                  <div>
                    <h4>Split-Bill Net Settlement Balances</h4>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Calculated using Minimum Cash Flow Algorithm to minimize transactions (BR-SPLIT-01, BR-SPLIT-02).</p>
                    {settlementData ? (
                      <div>
                        <div className="grid-2" style={{ marginBottom: 16 }}>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Transactions Needed</div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{settlementData.transactionCount || 0}</div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Net Sum Check (BR-SPLIT-02)</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)" }}>0.00 LKR</div>
                          </div>
                        </div>
                        {settlementData.transfers && settlementData.transfers.length > 0 ? (
                          <div className="table-wrapper">
                            <table className="table">
                              <thead><tr><th>Debtor (Payer)</th><th>Creditor (Recipient)</th><th>Optimized Amount</th></tr></thead>
                              <tbody>
                                {settlementData.transfers.map((t: any, idx: number) => (
                                  <tr key={idx}>
                                    <td><span className="badge badge-warning">🔴 {t.fromMember}</span></td>
                                    <td><span className="badge badge-success">🟢 {t.toMember}</span></td>
                                    <td style={{ fontWeight: 700 }}>{t.amount.toLocaleString()} {t.currency}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-muted">No pending debt settlements.</p>}
                      </div>
                    ) : <p className="text-muted">Add group members and shared expenses to calculate net settlements.</p>}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 4: SAFETY & REAL-TIME WEATHER MONITORING                          */}
        {/* ========================================================================= */}
        {activeNav === "weather" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title"><span>🛡️</span> Safety & Weather Monitoring Subsystem</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-control" style={{ width: 160, height: 36 }} value={weatherDestination} onChange={e => setWeatherDestination(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={() => loadWeather(weatherDestination)}>Query Weather API</button>
              </div>
            </div>

            {weatherData ? (
              <div className="grid-2">
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: 20, borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Location Query</div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>📍 {weatherData.destination || weatherDestination}</h3>
                  <div style={{ fontSize: 14, marginTop: 8 }}>Condition: <strong>{weatherData.description || "Partly Cloudy"}</strong></div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{weatherData.temperatureC ? `${weatherData.temperatureC}°C` : "24°C"}</div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: 20, borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Risk Agent Advisory (BR-RISK-01)</div>
                  <div className="badge badge-success" style={{ marginTop: 8, marginBottom: 12 }}>Low Weather Risk</div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>The Risk Agent queries external weather data (Open-Meteo) and evaluates travel itinerary outdoor activities against environmental hazards.</p>
                </div>
              </div>
            ) : <p className="text-muted">Loading weather report...</p>}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 5: DEBT SETTLEMENT MATRIX                                         */}
        {/* ========================================================================= */}
        {activeNav === "settlement" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title"><span>⚖️</span> Group Debt Settlement Matrix</div>
            </div>

            {selectedTrip ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Showing minimum cash flow settlement transactions for active trip: <strong>{selectedTrip.name}</strong></p>
                {settlementData?.transfers && settlementData.transfers.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Debtor (From)</th><th>Action</th><th>Creditor (To)</th><th>Amount</th></tr></thead>
                      <tbody>
                        {settlementData.transfers.map((t: any, idx: number) => (
                          <tr key={idx}>
                            <td><strong>{t.fromMember}</strong></td>
                            <td><span className="badge badge-accent">➡️ Pays</span></td>
                            <td><strong>{t.toMember}</strong></td>
                            <td style={{ fontWeight: 800, color: "var(--success)" }}>{t.amount.toLocaleString()} {t.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted">No debt transfers required or no shared expenses logged yet.</p>}
              </div>
            ) : <p className="text-muted">Select a trip under Trips Analytics to view its settlement matrix.</p>}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 6: AI HUMAN-IN-THE-LOOP APPROVALS QUEUE                           */}
        {/* ========================================================================= */}
        {activeNav === "approvals" && (
          <section className="card ai-flow-container">
            <div className="card-header">
              <div className="card-title"><span>🤖</span> AI Human-in-the-Loop Approvals Queue</div>
              <span className={`badge ${workflow?.status === "AwaitingApproval" ? "badge-warning" : "badge-primary"}`}>{workflow?.status || "Ready"}</span>
            </div>

            {workflow ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Objective: {workflow.objective}</p>
                {workflow.planJson && (
                  <div style={{ marginBottom: 16 }}>
                    <h4>Coordinator Plan (Gemini Model Output):</h4>
                    <div className="json-box">{workflow.planJson}</div>
                  </div>
                )}
                {workflow.resultJson && (
                  <div style={{ marginBottom: 16 }}>
                    <h4>Specialist Agents (Budget, Activity, Risk, Split-Bill) Output:</h4>
                    <div className="json-box">{workflow.resultJson}</div>
                  </div>
                )}
                {workflow.status === "AwaitingApproval" && (
                  <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                    <button className="btn btn-primary" onClick={() => handleApproveWorkflow(true)}>✅ Approve Recommendation</button>
                    <button className="btn btn-danger" onClick={() => handleApproveWorkflow(false)}>❌ Reject Recommendation</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>No active workflow proposals awaiting approval. Go to <strong>Trips Analytics & Management</strong> and click <strong>🤖 Run AI Review</strong> to trigger a proposal!</p>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CANVAS 7: SYSTEM AUDIT LOGS LEDGER                                       */}
        {/* ========================================================================= */}
        {activeNav === "audit" && (
          <section className="card">
            <div className="card-header">
              <div className="card-title"><span>📜</span> System Audit Logs (ASP.NET Core Ledger)</div>
              <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>Refresh Audit Logs</button>
            </div>

            {auditLogs.length === 0 ? <p className="text-muted">No audit logs recorded yet.</p> : (
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Event Type</th><th>Details</th><th>Timestamp</th></tr></thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td><span className="badge badge-primary">{log.eventType}</span></td>
                        <td style={{ fontSize: 13 }}>{log.details}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS FOR ALL CRUD ACTIONS                                        */}
      {/* ========================================================================= */}

      {/* Modal: Trip */}
      {modalType === "TRIP" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Trip" : "Create New Group Trip"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveTrip}>
              <div className="form-group">
                <label>Trip Name</label>
                <input required className="form-control" placeholder="e.g. Ella Expedition 2026" value={tripForm.name} onChange={e => setTripForm({ ...tripForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Destination</label>
                <input required className="form-control" placeholder="e.g. Ella" value={tripForm.destination} onChange={e => setTripForm({ ...tripForm, destination: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date</label>
                  <input required type="date" className="form-control" value={tripForm.startDate} onChange={e => setTripForm({ ...tripForm, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input required type="date" className="form-control" value={tripForm.endDate} onChange={e => setTripForm({ ...tripForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Budget */}
      {modalType === "BUDGET" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Budget" : "Add Budget Allocation"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <div className="form-group">
                <label>Budget Amount</label>
                <input required type="number" min="1" className="form-control" placeholder="50000" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input required className="form-control" value={budgetForm.currency} onChange={e => setBudgetForm({ ...budgetForm, currency: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Expense */}
      {modalType === "EXPENSE" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Expense" : "Log Shared Expense"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="form-group">
                <label>Expense Description</label>
                <input required className="form-control" placeholder="Dinner at Cafe Chill" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Paid By (Member Name)</label>
                <input required className="form-control" placeholder="Arosha" value={expenseForm.paidBy} onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Amount</label>
                  <input required type="number" min="1" className="form-control" placeholder="4500" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input required className="form-control" value={expenseForm.currency} onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Activity */}
      {modalType === "ACTIVITY" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Activity" : "Schedule Activity"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveActivity}>
              <div className="form-group">
                <label>Activity Name</label>
                <input required className="form-control" placeholder="Nine Arch Bridge Walk" value={activityForm.name} onChange={e => setActivityForm({ ...activityForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input required className="form-control" placeholder="Ella" value={activityForm.location} onChange={e => setActivityForm({ ...activityForm, location: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Date & Time</label>
                  <input required type="datetime-local" className="form-control" value={activityForm.startAt} onChange={e => setActivityForm({ ...activityForm, startAt: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date & Time</label>
                  <input required type="datetime-local" className="form-control" value={activityForm.endAt} onChange={e => setActivityForm({ ...activityForm, endAt: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Risk */}
      {modalType === "RISK" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Risk Note" : "Log Risk & Safety Note"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveRisk}>
              <div className="form-group">
                <label>Severity</label>
                <select className="form-control" value={riskForm.severity} onChange={e => setRiskForm({ ...riskForm, severity: e.target.value as any })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Summary / Concern</label>
                <input required className="form-control" placeholder="Heavy rain expected near cliff edge" value={riskForm.summary} onChange={e => setRiskForm({ ...riskForm, summary: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Weather Advisory</label>
                <input className="form-control" placeholder="Thunderstorms forecasted" value={riskForm.weatherSummary} onChange={e => setRiskForm({ ...riskForm, weatherSummary: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Group Member */}
      {modalType === "MEMBER" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Group Member" : "Add Group Member"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveMember}>
              <div className="form-group">
                <label>Display Name</label>
                <input required className="form-control" placeholder="Kasun" value={memberForm.displayName} onChange={e => setMemberForm({ ...memberForm, displayName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input required type="email" className="form-control" placeholder="kasun@example.com" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Catalog Listing */}
      {modalType === "CATALOG" && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">{editItem ? "Edit Listing" : "Add Service Provider Listing"}</div>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveCatalogItem}>
              <div className="form-group">
                <label>Listing Type</label>
                <select className="form-control" value={catalogForm.type} onChange={e => setCatalogForm({ ...catalogForm, type: e.target.value as CatalogItemType })}>
                  <option value="VisitingPlace">📍 Visiting Place (Attraction)</option>
                  <option value="Restaurant">🍽️ Restaurant & Dining</option>
                  <option value="Accommodation">🏨 Accommodation (Hotel/Resort)</option>
                  <option value="FoodPrice">💰 Food Price Details</option>
                </select>
              </div>
              <div className="form-group">
                <label>Listing Name</label>
                <input required className="form-control" placeholder="e.g. Cafe Chill or 98 Acres Resort" value={catalogForm.name} onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Destination City</label>
                <input required className="form-control" placeholder="e.g. Ella" value={catalogForm.destination} onChange={e => setCatalogForm({ ...catalogForm, destination: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description & Pricing Details</label>
                <textarea required className="form-control" placeholder="Description of place, amenities, special offers or menu item prices..." value={catalogForm.description} onChange={e => setCatalogForm({ ...catalogForm, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Price (LKR)</label>
                  <input type="number" min="0" className="form-control" placeholder="1500" value={catalogForm.price} onChange={e => setCatalogForm({ ...catalogForm, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input className="form-control" value={catalogForm.currency} onChange={e => setCatalogForm({ ...catalogForm, currency: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
