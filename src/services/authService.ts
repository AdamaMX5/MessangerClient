// Stub — wird bei echter API-Anbindung befüllt
export const authService = {
  checkEmail: async (_email: string) => ({ status: 'login' as const }),
  login: async (_email: string, _password: string) => ({ access_token: '' }),
  register: async (_email: string, _password: string, _repassword: string) => ({ access_token: '' }),
  logout: async () => {},
  refresh: async () => ({ access_token: '' }),
}
