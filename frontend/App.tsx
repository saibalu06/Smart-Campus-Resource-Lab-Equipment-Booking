import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { Header, type ActiveTab } from './components/Header';
import { MyBookingsView } from './components/MyBookingsView';
import { ResourceCatalog } from './components/ResourceCatalog';
import { ResourceFormModal } from './components/ResourceFormModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { AnalyticsSummary, Booking, Resource } from './types';

function WorkspaceApp() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingResources, setLoadingResources] = useState<boolean>(true);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingBookResource, setPendingBookResource] = useState<Resource | null>(null);
  const [bookingModalResource, setBookingModalResource] = useState<Resource | null>(null);
  const [resourceFormOpen, setResourceFormOpen] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const res = await api.getResources();
      setResources(res.resources);
    } catch {
      // Keep existing list on transient error
    } finally {
      setLoadingResources(false);
    }
  }, []);

  const fetchUserScopedData = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setAnalytics(null);
      return;
    }

    setLoadingBookings(true);
    try {
      const bookingsPromise = api.getBookings();
      const analyticsPromise =
        user.role === 'Lab Admin' ? api.getAnalyticsSummary() : Promise.resolve(null);

      const [bookingsRes, analyticsRes] = await Promise.all([
        bookingsPromise,
        analyticsPromise,
      ]);

      setBookings(bookingsRes.bookings);
      setAnalytics(analyticsRes ? analyticsRes.summary : null);
    } catch {
      // Errors handled individually inside views
    } finally {
      setLoadingBookings(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserScopedData();
    }
  }, [authLoading, fetchUserScopedData]);

  // Reset restricted tabs on logout
  useEffect(() => {
    if (!user && activeTab !== 'catalog') {
      setActiveTab('catalog');
    } else if (user && user.role !== 'Lab Admin' && activeTab === 'admin') {
      setActiveTab('catalog');
    }
  }, [user, activeTab]);

  function handleBookClick(resource: Resource) {
    if (!user) {
      setPendingBookResource(resource);
      setAuthModalOpen(true);
      return;
    }
    setBookingModalResource(resource);
  }

  function handleAuthSuccess() {
    if (pendingBookResource) {
      setBookingModalResource(pendingBookResource);
      setPendingBookResource(null);
    }
  }

  function handleRefreshAll() {
    fetchResources();
    fetchUserScopedData();
  }

  const pendingApprovalsCount =
    user?.role === 'Lab Admin'
      ? bookings.filter((b) => b.status === 'Pending').length
      : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAuth={() => {
          setPendingBookResource(null);
          setAuthModalOpen(true);
        }}
        pendingCount={pendingApprovalsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <ResourceCatalog
            resources={resources}
            loading={loadingResources}
            onBookResource={handleBookClick}
            onEditResource={(res) => {
              setEditingResource(res);
              setResourceFormOpen(true);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            onViewMyBookings={() => setActiveTab('my-bookings')}
          />
        )}

        {activeTab === 'my-bookings' && user && (
          <MyBookingsView
            bookings={bookings}
            loading={loadingBookings}
            onRefresh={handleRefreshAll}
            onBrowseCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'admin' && user?.role === 'Lab Admin' && (
          <AdminDashboardView
            resources={resources}
            bookings={bookings}
            summary={analytics}
            loading={loadingBookings}
            onRefreshAll={handleRefreshAll}
            onAddResource={() => {
              setEditingResource(null);
              setResourceFormOpen(true);
            }}
            onEditResource={(res) => {
              setEditingResource(res);
              setResourceFormOpen(true);
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>CampusLab Reserve · Academic Equipment & Room Scheduling</span>
          <span>Operating Hours: 08:00 – 20:00 Local Campus Time</span>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingBookResource(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      <BookingModal
        resource={bookingModalResource}
        onClose={() => setBookingModalResource(null)}
        onBooked={handleRefreshAll}
      />

      <ResourceFormModal
        isOpen={resourceFormOpen}
        editingResource={editingResource}
        onClose={() => {
          setResourceFormOpen(false);
          setEditingResource(null);
        }}
        onSaved={handleRefreshAll}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceApp />
    </AuthProvider>
  );
}
