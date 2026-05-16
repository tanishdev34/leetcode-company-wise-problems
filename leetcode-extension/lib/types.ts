export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface AddSolutionMessage {
  action: 'ADD_SOLUTION'
  titleSlug: string
  code?: string | null
  language?: string | null
}

export interface LoginMessage {
  action: 'LOGIN'
  email: string
  password: string
}

export interface LogoutMessage {
  action: 'LOGOUT'
}

export interface CheckAuthMessage {
  action: 'CHECK_AUTH'
}

export interface GetTodayCountMessage {
  action: 'GET_TODAY_COUNT'
}

export type ExtensionMessage =
  | AddSolutionMessage
  | LoginMessage
  | LogoutMessage
  | CheckAuthMessage
  | GetTodayCountMessage
