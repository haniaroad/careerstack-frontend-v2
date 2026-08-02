import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StatusPage } from './pages/StatusPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
