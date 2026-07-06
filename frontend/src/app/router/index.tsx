import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@pages/home'
import { LoginPage } from '@pages/login'
import { RegisterPage } from '@pages/register'
import { AttributesPage } from '@pages/attributes'
import { ROUTES } from '@shared/config/routes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.attributes} element={<AttributesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
