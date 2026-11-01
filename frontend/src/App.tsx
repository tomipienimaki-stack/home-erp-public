import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  CalendarDays,
  Heart,
  Home,
  LogOut,
  ShoppingBasket,
  Snowflake,
  Sprout,
  Star,
  Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from './lib/cn';
import AuthGate from './lib/AuthGate';
import { authDisabled, supabase } from './lib/supabase';
import PantryView from './views/PantryView';
import ShoppingView from './views/ShoppingView';
import RecipesView from './views/RecipesView';
import MealPlanView from './views/MealPlanView';
import PreferencesView from './views/PreferencesView';
import FavoritesView from './views/FavoritesView';
import FreezerView from './views/FreezerView';

export default function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pb-24 sm:pb-10 pt-6">
        <Routes>
          <Route path="/" element={<Navigate to="/meal-plan" replace />} />
          <Route path="/meal-plan" element={<MealPlanView />} />
          <Route path="/recipes" element={<RecipesView />} />
          <Route path="/pantry" element={<PantryView />} />
          <Route path="/shopping" element={<ShoppingView />} />
          <Route path="/freezer" element={<FreezerView />} />
          <Route path="/favorites" element={<FavoritesView />} />
          <Route path="/preferences" element={<PreferencesView />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

const LINKS: { to: string; icon: React.ReactNode; label: string }[] = [
  { to: '/meal-plan', icon: <CalendarDays className="w-4 h-4" />, label: 'Viikko' },
  { to: '/recipes',   icon: <Utensils className="w-4 h-4" />,     label: 'Reseptit' },
  { to: '/pantry',    icon: <Sprout className="w-4 h-4" />,       label: 'Varasto' },
  { to: '/freezer',   icon: <Snowflake className="w-4 h-4" />,    label: 'Pakastin' },
  { to: '/shopping',  icon: <ShoppingBasket className="w-4 h-4" />, label: 'Ostokset' },
  { to: '/favorites', icon: <Star className="w-4 h-4" />,         label: 'Suosikit' },
  { to: '/preferences', icon: <Heart className="w-4 h-4" />,      label: 'Asetukset' },
];

function TopBar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-cream-50/80 border-b border-cream-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <motion.div
            initial={{ rotate: -8, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="w-10 h-10 rounded-2xl bg-forest-600 text-cream-50 grid place-items-center shadow-soft"
          >
            <Home className="w-5 h-5" />
          </motion.div>
          <div className="hidden sm:block">
            <div className="font-display text-lg leading-tight text-forest-700">Koti</div>
            <div className="text-xs text-ink-500 -mt-0.5">Varasto, reseptit & viikko</div>
          </div>
        </div>
        <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
          {LINKS.map((l) => (
            <DesktopLink key={l.to} {...l} />
          ))}
        </nav>
        {!authDisabled() && (
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="btn-ghost shrink-0 text-sm px-3 py-2"
            aria-label="Kirjaudu ulos"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Kirjaudu ulos</span>
          </button>
        )}
      </div>
    </header>
  );
}

function DesktopLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition whitespace-nowrap',
          isActive ? 'bg-forest-600 text-cream-50' : 'text-ink-700 hover:bg-cream-100',
        )
      }
    >
      {icon} {label}
    </NavLink>
  );
}

function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2 bg-gradient-to-t from-cream-50 via-cream-50/95 to-cream-50/0">
      <div className="card flex items-center justify-around p-1.5 shadow-soft">
        {LINKS.map((l) => (
          <MobileLink key={l.to} {...l} />
        ))}
      </div>
    </nav>
  );
}

function MobileLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-full text-[10px] font-medium transition',
          isActive ? 'bg-forest-600 text-cream-50' : 'text-ink-700',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
