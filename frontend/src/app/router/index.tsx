import { type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@pages/home'
import { LoginPage } from '@pages/login'
import { RegisterPage } from '@pages/register'
import { AttributesPage } from '@pages/attributes'
import { TagsPage } from '@pages/tags'
import { PositionsPage } from '@pages/positions'
import { CvDetailPage, CvsPage } from '@pages/cvs'
import { ProjectsPage } from '@pages/projects'
import { UsersPage } from '@pages/users'
import { ProfileDetailPage, ProfilePage } from '@pages/profile'
import { RequireAuth } from '@features/require-auth'
import { ROUTES } from '@shared/config/routes'

const protectedRoutes: { path: string; element: ReactNode }[] = [
  { path: ROUTES.attributes, element: <AttributesPage /> },
  { path: ROUTES.tags, element: <TagsPage /> },
  { path: ROUTES.cvs, element: <CvsPage /> },
  { path: ROUTES.cvDetail, element: <CvDetailPage /> },
  { path: ROUTES.projects, element: <ProjectsPage /> },
  { path: ROUTES.users, element: <UsersPage /> },
  { path: ROUTES.profile, element: <ProfilePage /> },
  { path: ROUTES.profileDetail, element: <ProfileDetailPage /> },
]

const publicRoutes: { path: string; element: ReactNode }[] = [
  { path: ROUTES.home, element: <HomePage /> },
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.register, element: <RegisterPage /> },
  { path: ROUTES.positions, element: <PositionsPage /> },
]

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {publicRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        {protectedRoutes.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={<RequireAuth>{element}</RequireAuth>}
          />
        ))}
      </Routes>
    </BrowserRouter>
  )
}
