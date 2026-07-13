import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@pages/home'
import { LoginPage } from '@pages/login'
import { RegisterPage } from '@pages/register'
import { AttributesPage } from '@pages/attributes'
import { TagsPage } from '@pages/tags'
import { PositionsPage } from '@pages/positions'
import { CvDetailPage, CvsPage } from '@pages/cvs'
import { ProjectsPage } from '@pages/projects'
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
        <Route path={ROUTES.positions} element={<PositionsPage />} />
        <Route path={ROUTES.cvs} element={<CvsPage />} />
        <Route path={ROUTES.cvDetail} element={<CvDetailPage />} />
        <Route path={ROUTES.projects} element={<ProjectsPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.profileDetail} element={<ProfileDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
