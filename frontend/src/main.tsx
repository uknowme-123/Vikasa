import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDataProvider, setDataProvider, createFlaskProvider, demoProvider } from './services/api'
import App from './App'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

async function initializeProvider() {
  const savedUrl = localStorage.getItem('vikasa-api-url')
  const demoMode = localStorage.getItem('vikasa-demo-mode')
  const envUrl = import.meta.env.VITE_API_BASE_URL

  // Priority: localStorage > env var > demo
  const apiUrl = savedUrl || envUrl

  if (apiUrl && demoMode !== 'true') {
    try {
      const provider = await createFlaskProvider(apiUrl)
      setDataProvider(provider)
    } catch {
      // Fall back to demo on error
      setDataProvider(demoProvider)
    }
  } else {
    setDataProvider(demoProvider)
  }
}

initializeProvider().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}).catch(console.error)