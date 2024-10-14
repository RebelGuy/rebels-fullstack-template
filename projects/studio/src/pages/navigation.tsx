import LoginForm from '@INIT__PATH_ALIAS/studio/pages/login/LoginForm'
import React from 'react'
import Home from '@INIT__PATH_ALIAS/studio/pages/home/Home'
import { AccountCircle, Home as HomeIcon, Security } from '@mui/icons-material'
import { Props as RequireRankProps } from '@INIT__PATH_ALIAS/studio/components/default/RequireRank'
import ResetPasswordForm from '@INIT__PATH_ALIAS/studio/pages/login/ResetPasswordForm'
import { SafeOmit } from '@INIT__PATH_ALIAS/shared/types'
import TasksPage from '@INIT__PATH_ALIAS/studio/pages/admin/task/TasksPage'

export type Page = {
  id: string
  title: string
  element: React.ReactElement
  icon: React.ReactElement
  path: string
  requiresLogin: boolean
  requireRanksProps: SafeOmit<RequireRankProps, 'children' | 'hideAdminOutline'> | null
}

// by typing out pages as `const`s, we can enforce the required route parameters to be provided when generating paths (via `generatePath`)
export const PageHome = {
  id: 'home',
  title: 'Home',
  element: <Home />,
  icon: <HomeIcon />,
  path: '/',
  requiresLogin: false,
  requireRanksProps: null
} as const

export const PageLogin = {
  id: 'login',
  title: 'Login',
  element: <LoginForm />,
  icon: <AccountCircle />,
  path: '/login',
  requiresLogin: false,
  requireRanksProps: null
} as const

export const PageChangePassword = {
  id: 'changePassword',
  title: 'Change Password',
  element: <ResetPasswordForm />,
  icon: <AccountCircle />,
  path: '/changePassword',
  requiresLogin: true,
  requireRanksProps: null
} as const

export const PageTask = {
  id: 'task',
  title: 'Tasks',
  element: <TasksPage />,
  icon: <Security />,
  path: '/admin/task',
  requiresLogin: true,
  requireRanksProps: { admin: true }
} as const

export const pages: ReadonlyArray<Page> = [PageHome, PageLogin, PageChangePassword, PageTask]
