import { baseUrl } from '../baseurl'

export const LoginApi = {
  loginCredentials: (email: string, password: string): Promise<Record<'access_token', string>> => {
    return fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to login')
      }
      return response.json()
    })
  },
  registerCredentials: (
    username: string,
    email: string,
    password: string,
  ): Promise<Record<'access_token', string>> => {
    return fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('Failed to register')
      }
      return response.json()
    })
  },
}
