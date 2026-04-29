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
import ListingView from "./pages/ListingView";
import FlightResults from "./pages/FlightResults";
import FlightDetails from "./pages/FlightDetails";
import FlightBooking from "./pages/FlightBooking";
import HotelList from "./pages/HotelList";
import HotelDetails from "./pages/HotelDetails";
import CarRentals from "./pages/CarRentals";
import VisaList from "./pages/VisaList";
import TravelGroupDetails from "./pages/TravelGroupDetails";
import ProfileScreen from "./pages/ProfileScreen";
import ProfileSubPage from "./pages/ProfileSubPage";
import BookingsScreen from "./pages/BookingsScreen";
import AirportTaxiPage from "./pages/AirportTaxiPage";
import FlightStatusPage from "./pages/FlightStatusPage";
import InvoiceScreen from "./pages/InvoiceScreen";
import PassengerDetails from "./pages/PassengerDetails";
import BookingSuccess from "./pages/BookingSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<SplashScreen />} />
    <Route path="/onboarding" element={<OnboardingScreen />} />
    <Route path="/login" element={<LoginScreen />} />
    <Route path="/home" element={<HomeScreen />} />
    <Route path="/listings" element={<ListingView />} />
    <Route path="/flights" element={<FlightResults />} />
    <Route path="/flights/:id" element={<FlightDetails />} />
    <Route path="/flights/booking" element={<FlightBooking />} />
    <Route path="/hotels" element={<HotelList />} />
    <Route path="/hotel/:id" element={<HotelDetails />} />
    <Route path="/cars" element={<CarRentals />} />
    <Route path="/visa" element={<VisaList />} />
    <Route path="/taxi" element={<AirportTaxiPage />} />
    <Route path="/flight-status" element={<FlightStatusPage />} />
    <Route path="/groups/:id" element={<TravelGroupDetails />} />
    <Route path="/profile" element={<ProfileScreen />} />
    <Route path="/profile/:type" element={<ProfileSubPage />} />
    <Route path="/bookings" element={<BookingsScreen />} />
    <Route path="/invoice/:id" element={<InvoiceScreen />} />
    <Route path="/passenger-details" element={<PassengerDetails />} />
    <Route path="/booking-success" element={<BookingSuccess />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLocked = document.body.hasAttribute('data-scroll-locked');
      const containers = document.querySelectorAll('.mobile-container');
      containers.forEach(container => {
        if (isLocked) container.setAttribute('inert', '');
        else container.removeAttribute('inert');
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
