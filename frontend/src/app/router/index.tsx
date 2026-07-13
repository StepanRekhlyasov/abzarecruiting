import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@pages/home'
import { LoginPage } from '@pages/login'
import { RegisterPage } from '@pages/register'
import { AttributesPage } from '@pages/attributes'
import { TagsPage } from '@pages/tags'
import { ProfileDetailPage, ProfilePage } from '@pages/profile'
import { ROUTES } from '@shared/config/routes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.attributes} element={<AttributesPage />} />
        <Route path={ROUTES.tags} element={<TagsPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.profileDetail} element={<ProfileDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
