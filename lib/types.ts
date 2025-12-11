export type Locale = 'fr' | 'en'
export type ContractType = 'Permanent' | 'Fixed' | 'Internship' | 'Workstudy' | 'Freelance'

export type ExperienceTranslationDTO = {
  locale: Locale
  jobTitle: string
  description: string
}

export type ExperienceDTO = {
  id: string
  startDate: string // ISO
  endDate: string // ISO
  contractType: ContractType
  localisation: string
  isVisible: boolean
  siteUrl?: string | null
  companyName: string
  tagIds: string[] // relation pivot
  translations: ExperienceTranslationDTO[] // unique(locale)
}

export type TagDTO = {
  id: string
  type: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH'
  isVisible: boolean
  hexColor: string
  nameByLocale: Record<Locale, string> // dérivé de TagTranslation
}
