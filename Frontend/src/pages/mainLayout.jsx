import { Outlet } from 'react-router-dom'
import { CreateModalProvider } from '../context/CreateModalContext.jsx'

export default function MainLayout() {
  return (
    <CreateModalProvider>
      <main>
        <Outlet />
      </main>
    </CreateModalProvider>
  )
}
