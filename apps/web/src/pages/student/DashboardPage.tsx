import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { BookOpen, Target, Flame, Clock, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { StudentLayout } from '@/components/layout/RoleLayouts'
import { TargetTestWidget } from '@/components/student/TargetTestWidget'
import { apiFetch } from '@/services/api'

const weeklyData = [
  { day: 'Mon', lessons: 0 },
  { day: 'Tue', lessons: 0 },
  { day: 'Wed', lessons: 0 },
  { day: 'Thu', lessons: 0 },
  { day: 'Fri', lessons: 0 },
  { day: 'Sat', lessons: 0 },
  { day: 'Sun', lessons: 0 },
]

const scoreData = [
  { week: 'W1', score: 0 },
  { week: 'W2', score: 0 },
  { week: 'W3', score: 0 },
  { week: 'W4', score: 0 },
]

interface ProgressStats {
  lessonsCompleted: number
  averageScore: number
  timeStudiedSeconds: number
  streakDays: number
}

interface RecentProgress {
  lessonTitle: string
  subjectName: string
  isComplete: boolean
}

const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  return h > 0 ? `${h}h` : '<1h'
}

export default function StudentDashboardPage() {
  const { user } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: async () => {
      const res = await apiFetch<ProgressStats>('/progress/stats')
      if (!res.ok) return null
      return res.data!
    },
  })

  const { data: recent } = useQuery({
    queryKey: ['progress-recent'],
    queryFn: async () => {
      const res = await apiFetch<RecentProgress[]>('/progress/recent')
      if (!res.ok) return []
      return res.data ?? []
    },
  })

  const todayIndex = (new Date().getDay() + 6) % 7

  return (
    <StudentLayout>
      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1">
          <section className="relative mb-6 overflow-hidden rounded-2xl bg-brand-green p-6 text-white md:p-8">
            <span className="absolute right-4 top-4 text-2xl text-brand-mustard" aria-hidden>
              ✦
            </span>
            <div className="relative">
              <h1 className="font-serif text-2xl font-bold text-white md:text-4xl">
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="mt-2 text-sm text-green-200 md:text-base">
                Here is your study overview for today.
              </p>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <div className="flex flex-col gap-2 rounded-2xl bg-brand-lavender p-4 text-white sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="font-serif text-2xl font-bold md:text-4xl">{stats?.lessonsCompleted ?? 0}</p>
              <div className="flex items-center gap-2">
                <BookOpen size={18} />
                <span className="text-xs font-medium sm:text-sm">Lessons completed</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-brand-mustard p-4 text-brand-black sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="font-serif text-2xl font-bold md:text-4xl">{stats?.averageScore ?? 0}%</p>
              <div className="flex items-center gap-2">
                <Target size={18} />
                <span className="text-xs font-medium sm:text-sm">Average score</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-brand-sky p-4 text-brand-black sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="font-serif text-2xl font-bold md:text-4xl">{stats?.streakDays ?? 0}</p>
              <div className="flex items-center gap-2">
                <Flame size={18} />
                <span className="text-xs font-medium sm:text-sm">Day streak</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-brand-tangerine p-4 text-white sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <p className="font-serif text-2xl font-bold md:text-4xl">
                {formatHours(stats?.timeStudiedSeconds ?? 0)}
              </p>
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span className="text-xs font-medium sm:text-sm">Hours studied</span>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-4 font-serif text-xl font-semibold md:text-2xl">My subjects</h2>
            <div className="rounded-2xl border-2 border-dashed border-ui-border bg-white p-8 text-center md:p-10">
              <BookOpen className="mx-auto mb-3 size-12 text-ui-muted" />
              <p className="font-serif text-lg md:text-xl">Start exploring subjects</p>
              <p className="mt-1 text-sm text-ui-muted">Your first lesson in every subject is free</p>
              <Link
                to="/subjects"
                className="mt-4 inline-block rounded-xl bg-brand-green px-6 py-2.5 text-sm font-semibold text-white"
              >
                Browse subjects
              </Link>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="rounded-2xl border border-ui-border bg-white p-4 md:p-6">
              <h3 className="mb-4 font-serif text-lg font-semibold">Weekly activity</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="lessons" fill="#245E55" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-ui-border bg-white p-4 md:p-6">
              <h3 className="mb-4 font-serif text-lg font-semibold">Score over time</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scoreData}>
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line dataKey="score" stroke="#245E55" strokeWidth={2} dot={{ fill: '#245E55' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-xl font-semibold md:text-2xl">Recent activity</h2>
            {recent && recent.length > 0 ? (
              <div className="space-y-3">
                {recent.map((item, i) => (
                  <div
                    key={`${item.lessonTitle}-${i}`}
                    className="rounded-2xl border border-ui-border bg-white p-4"
                  >
                    <p className="font-semibold">{item.lessonTitle}</p>
                    <p className="text-sm text-ui-muted">{item.subjectName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-ui-border bg-white p-8 text-center text-ui-muted">
                No activity yet. Start studying!
              </div>
            )}
          </section>
        </div>

        <aside className="mobile-hidden sticky top-8 ml-0 mt-6 w-full shrink-0 space-y-6 self-start lg:ml-6 lg:mt-0 lg:block lg:w-72">
          <TargetTestWidget />

          <div className="rounded-2xl border border-ui-border bg-white p-5">
            <h3 className="mb-3 font-serif text-base font-semibold">This week</h3>
            <div className="flex flex-row justify-between">
              {weekDayLabels.map((label, index) => (
                <div key={index} className="text-center text-xs">
                  {index === todayIndex ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green font-medium text-white">
                      {label}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center text-ui-muted">{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ui-border bg-white p-5">
            <h3 className="mb-3 font-serif text-base font-semibold">Quick links</h3>
            <Link
              to="/subjects"
              className="block border-b border-ui-border py-1.5 text-sm font-medium text-brand-green"
            >
              Browse subjects <ArrowRight className="inline size-3.5" />
            </Link>
            <Link
              to="/past-papers"
              className="block border-b border-ui-border py-1.5 text-sm font-medium text-brand-green"
            >
              Past papers <ArrowRight className="inline size-3.5" />
            </Link>
            <Link to="/progress" className="block py-1.5 text-sm font-medium text-brand-green">
              My progress <ArrowRight className="inline size-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </StudentLayout>
  )
}
