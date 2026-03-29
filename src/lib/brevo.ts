// Brevo Contacts API
// Docs: https://developers.brevo.com/reference/createcontact

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts'

export type LeadSource = 'meta_web' | 'telegram' | 'organic'

export interface BrevoContactPayload {
  email: string
  firstName?: string
  lastName?: string
  schoolName?: string
  cityName?: string
  year?: string
  source?: LeadSource
}

export async function addContactToBrevo(data: BrevoContactPayload): Promise<void> {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY as string
  const listId = Number(import.meta.env.VITE_BREVO_LIST_ID)

  if (!apiKey || !listId) {
    throw new Error('Brevo API key or list ID is not configured. Check your .env file.')
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      email: data.email,
      attributes: {
        FIRSTNAME:  data.firstName  ?? '',
        LASTNAME:   data.lastName   ?? '',
        SCHOOL:     data.schoolName ?? '',
        CITY:       data.cityName   ?? '',
        YEAR:       data.year       ?? '',
        SOURCE:     data.source     ?? 'organic',
      },
      listIds: [listId],
      updateEnabled: true,
    }),
  })

  // 201 = created, 204 = updated
  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message ?? `Brevo API error: ${response.status}`)
  }
}