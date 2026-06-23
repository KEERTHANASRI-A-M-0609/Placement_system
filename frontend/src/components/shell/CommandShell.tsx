import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { motion } from 'framer-motion'

import {

  Command, Activity, Briefcase, BookOpen, CalendarDays,

  BarChart3, Settings, Bell, Sun, Moon, LogOut, Brain, Flame, LayoutGrid, Library,

} from 'lucide-react'

import { useApp } from '../../store/AppContext'

import { computeOverall } from '../../engine/intelligence'

import { computeReadinessConfidence } from '../../engine/assessmentEngine'

import CareerChatWidget from '../chat/CareerChatWidget'
import SyncStatusBar from '../SyncStatusBar'
import AnimatedNumber from '../motion/AnimatedNumber'



const NAV = [

  { to: '/', icon: Command, label: 'Command' },

  { to: '/workspace', icon: LayoutGrid, label: 'Workspace' },

  { to: '/health', icon: Activity, label: 'Assess' },

  { to: '/applications', icon: Briefcase, label: 'Pipeline' },

  { to: '/resources', icon: BookOpen, label: 'Resources' },

  { to: '/knowledge', icon: Library, label: 'Knowledge' },

  { to: '/planner', icon: CalendarDays, label: 'Planner' },

  { to: '/momentum', icon: Flame, label: 'Momentum' },

  { to: '/failures', icon: Brain, label: 'Intel' },

  { to: '/reports', icon: BarChart3, label: 'Reports' },

]



const MOBILE_NAV = NAV.slice(0, 5)



export default function CommandShell({ children }: { children: React.ReactNode }) {

  const { user, assessment, theme, toggleTheme, signOut, setView, notifications, platformData } = useApp()

  const location = useLocation()
  const navigate = useNavigate()



  const confidence = computeReadinessConfidence(assessment, platformData ?? null)

  const score = confidence.measuredSections > 0 && assessment ? computeOverall(assessment) : null

  const unread = (notifications ?? []).filter(n => !n.read).length



  return (

    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <SyncStatusBar />

      <header className="sticky top-0 z-50 shrink-0 shadow-md vertex-header">

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3 sm:gap-6">

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">

            <div

              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"

              style={{ background: '#fff', color: 'var(--commerce-blue)' }}

            >

              <Command size={15} strokeWidth={2.5} />

            </div>

            <div className="hidden sm:block min-w-0">

              <p className="font-display font-bold text-sm leading-none text-white truncate">
                Vertex
              </p>
              <p className="text-[10px] mt-0.5 font-medium text-indigo-100">
                Placement Intelligence
              </p>

            </div>

          </div>



          <nav className="shell-top-nav flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 min-w-0">

            {NAV.map(({ to, icon: Icon, label }) => (

              <NavLink

                key={to}

                to={to}

                end={to === '/'}

                onClick={() => setView('app')}

                className={({ isActive }) => `shell-nav-link ${isActive ? 'active' : ''}`}

              >

                <Icon size={14} strokeWidth={2} />

                <span className="hidden md:inline">{label}</span>

              </NavLink>

            ))}

          </nav>



          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            {score !== null && (

              <div

                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl"

                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}

              >

                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Ready</span>

                <AnimatedNumber

                  value={score}

                  suffix="%"

                  className="text-sm font-bold text-white"

                />

              </div>

            )}



            <button

              type="button"

              onClick={() => navigate('/notifications')}

              className="relative p-2 rounded-xl transition-colors hover:bg-white/15"

              aria-label="Notifications"

            >

              <Bell size={18} className="text-white/90" />

              {unread > 0 && (

                <span

                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"

                  style={{ background: 'var(--danger)' }}

                >

                  {unread}

                </span>

              )}

            </button>



            <NavLink to="/settings" onClick={() => setView('app')} className="p-2 rounded-xl transition-colors hover:bg-white/15" aria-label="Settings">

              <Settings size={18} className="text-white/90" />

            </NavLink>



            <button type="button" onClick={toggleTheme} className="hidden sm:block p-2 rounded-xl transition-colors hover:bg-white/15" aria-label="Toggle theme">

              {theme === 'dark' ? <Sun size={18} className="text-white/90" /> : <Moon size={18} className="text-white/90" />}

            </button>



            {user && (

              <div

                className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 ml-0 sm:ml-1"

                style={{ borderLeft: '1px solid rgba(255,255,255,0.25)' }}

              >

                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-indigo-700 shrink-0">

                  {user.name[0]?.toUpperCase()}

                </div>

                <button

                  type="button"

                  onClick={signOut}

                  className="hidden sm:block p-2 rounded-xl transition-colors hover:bg-white/15"

                  title="Sign out"

                >

                  <LogOut size={16} className="text-white/80" />

                </button>

              </div>

            )}

          </div>

        </div>

      </header>



      <motion.main

        key={location.pathname}

        initial={{ opacity: 0, y: 8 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}

        className="flex-1 shell-main-pad min-w-0 overflow-x-hidden"

      >

        {children}

      </motion.main>



      {/* Mobile bottom navigation */}

      <nav className="shell-mobile-nav" aria-label="Main navigation">

        {MOBILE_NAV.map(({ to, icon: Icon, label }) => (

          <NavLink

            key={to}

            to={to}

            end={to === '/'}

            onClick={() => setView('app')}

            className={({ isActive }) => `shell-mobile-link ${isActive ? 'active' : ''}`}

          >

            <Icon size={20} strokeWidth={2} />

            <span className="truncate max-w-full">{label}</span>

          </NavLink>

        ))}

      </nav>

      <CareerChatWidget />

    </div>

  )

}


