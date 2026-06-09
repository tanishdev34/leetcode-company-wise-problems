const LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

async function graphqlQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
      "User-Agent": "LC-Tracker/1.0",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`LeetCode GraphQL ${res.status}`)

  const json: GraphQLResponse<T> = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  if (!json.data) throw new Error("No data returned")

  return json.data
}

export interface RecentSubmission {
  id: string
  title: string
  titleSlug: string
  timestamp: string
}

export async function fetchRecentAcSubmissions(username: string, limit = 100): Promise<RecentSubmission[]> {
  const data = await graphqlQuery<{
    recentAcSubmissionList: RecentSubmission[]
  }>(
    `query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }`,
    { username, limit }
  )
  return data.recentAcSubmissionList
}

export interface QuestionDetails {
  questionId: string
  questionFrontendId: string
  title: string
  titleSlug: string
  difficulty: string
  acRate: number
  isPaidOnly: boolean
  topicTags: Array<{ name: string; slug: string }>
}

export async function fetchQuestionDetails(titleSlug: string): Promise<QuestionDetails | null> {
  try {
    const data = await graphqlQuery<{ question: QuestionDetails | null }>(
      `query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
          acRate
          isPaidOnly
          topicTags {
            name
            slug
          }
        }
      }`,
      { titleSlug }
    )
    return data.question
  } catch {
    return null
  }
}

export interface UserProgress {
  allQuestionsCount: Array<{ difficulty: string; count: number }>
  matchedUser: {
    submitStats: {
      acSubmissionNum: Array<{ difficulty: string; count: number; submissions: number }>
    }
  } | null
}

export async function fetchUserProgress(username: string): Promise<UserProgress> {
  return graphqlQuery<UserProgress>(
    `query userSessionProgress($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }`,
    { username }
  )
}
