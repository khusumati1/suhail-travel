import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { AuthProvider } from "./hooks/useAuth";
import SplashScreen from "./pages/SplashScreen";
import OnboardingScreen from "./pages/OnboardingScreen";
import LoginScreen from "./pages/LoginScreen";
import HomeScreen from "./pages/HomeScreen";
import FlightResults from "./pages/FlightResults";
import HotelList from "./pages/HotelList";
import FlightDetails from "./pages/FlightDetails";
import HotelDetails from "./pages/HotelDetails";
import VisaList from "./pages/VisaList";
import TravelGroupDetails from "./pages/TravelGroupDetails";
import PaymentScreen from "./pages/PaymentScreen";
import ProfileScreen from "./pages/ProfileScreen";
import BookingsScreen from "./pages/BookingsScreen";
import CarRentals from "./pages/CarRentals";
import AirportTaxiPage from "./pages/AirportTaxiPage";
import FlightStatusPage from "./pages/FlightStatusPage";
import InvoiceScreen from "./pages/InvoiceScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<SplashScreen />} />
    <Route path="/onboarding" element={<OnboardingScreen />} />
    <Route path="/login" element={<LoginScreen />} />
    <Route path="/home" element={<HomeScreen />} />
    <Route path="/flights" element={<FlightResults />} />
    <Route path="/flights/:id" element={<FlightDetails />} />
    <Route path="/hotels" element={<HotelList />} />
    <Route path="/hotels/:id" element={<HotelDetails />} />
    <Route path="/cars" element={<CarRentals />} />
    <Route path="/visa" element={<VisaList />} />
      <Route path="/taxi" element={<AirportTaxiPage />} />
      <Route path="/flight-status" element={<FlightStatusPage />} />
      <Route path="/groups/:id" element={<TravelGroupDetails />} />
    <Route path="/payment" element={<PaymentScreen />} />
    <Route path="/profile" element={<ProfileScreen />} />
    <Route path="/bookings" element={<BookingsScreen />} />
    <Route path="/invoice/:id" element={<InvoiceScreen />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  // Global Accessibility Fix: Use 'inert' when a modal is open to prevent "Blocked aria-hidden" warnings
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLocked = document.body.hasAttribute('data-scroll-locked');
      const containers = document.querySelectorAll('.mobile-container');
      
      containers.forEach(container => {
        if (isLocked) {
          container.setAttribute('inert', '');
        } else {
          container.removeAttribute('inert');
        }
      });
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] });
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
