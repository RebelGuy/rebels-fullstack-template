import { ApiRequest, ApiResponse } from '@INIT__PATH_ALIAS/api-models/types'
import { EmptyObject } from '@INIT__PATH_ALIAS/shared/types'

export type RegisterRequest = ApiRequest<{ username: string, password: string }>
export type RegisterResponse = ApiResponse<{ loginToken: string }>

export type LoginRequest = ApiRequest<{ username: string, password: string }>
export type LoginResponse = ApiResponse<{ loginToken: string }>

export type LogoutResponse = ApiResponse<EmptyObject>

export type AuthenticateResponse = ApiResponse<{ username: string }>

export type ResetPasswordRequest = ApiRequest<{ oldPassword: string, newPassword: string }>
export type ResetPasswordResponse = ApiResponse<{ loginToken: string }>
