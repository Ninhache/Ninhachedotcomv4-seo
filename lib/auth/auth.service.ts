import { LoginApi } from './auth.api'

export const LoginService = {
  loginCredentials: (email: string, password: string) => {
    return LoginApi.loginCredentials(email, password)
  },
}
