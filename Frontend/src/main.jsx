import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { Provider as ReduxProvider } from 'react-redux'
import { ThemeProvider } from './context/ThemeContext.jsx'
import router from './routes/router.jsx'
import store from './redux/store/store.js'
import { getCurrentUser } from './redux/features/auth/authSlice.js'

const AppBootstrap = () => {
  useEffect(() => {
    store.dispatch(getCurrentUser())
  }, [])

  return (
    <ThemeProvider>
      <ReduxProvider store={store}>
        <RouterProvider router={router} />
      </ReduxProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>
)
