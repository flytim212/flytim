/** 应用外壳：页面路由（本地 Tab 切换）+ 底部导航 */
import TabBar from './components/TabBar'
import EquityPage from './pages/EquityPage'
import FishPage from './pages/FishPage'
import HomePage from './pages/HomePage'
import RangePage from './pages/RangePage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './stores/appStore'

export default function App() {
  const tab = useAppStore((s) => s.tab)

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-28">
        {tab === 'home' && <HomePage />}
        {tab === 'equity' && <EquityPage />}
        {tab === 'range' && <RangePage />}
        {tab === 'fish' && <FishPage />}
        {tab === 'review' && <ReviewPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <TabBar />
    </div>
  )
}
