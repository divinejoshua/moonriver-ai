export const AVATARS = [
  { id: 0, name: 'Marcus', src: '/avatars/1.jpeg' },
  { id: 1, name: 'Sophie', src: '/avatars/2.jpeg' },
  { id: 2, name: 'Jade', src: '/avatars/3.jpeg' },
  { id: 3, name: 'Aria', src: '/avatars/4.jpeg' },
  { id: 4, name: 'Liam', src: '/avatars/5.jpeg' },
  { id: 5, name: 'Zara', src: '/avatars/6.jpeg' },
  { id: 6, name: 'Noah', src: '/avatars/7.jpeg' },
  { id: 7, name: 'Chloe', src: '/avatars/8.jpeg' },
  { id: 8, name: 'Jordan', src: '/avatars/9.jpeg' },
  { id: 9, name: 'Naomi', src: '/avatars/10.jpeg' },
  { id: 10, name: 'Andre', src: '/avatars/11.jpeg' },
  { id: 11, name: 'Mia', src: '/avatars/12.jpeg' },
  { id: 12, name: 'Elena', src: '/avatars/13.jpeg' },
] as const

export const ONBOARDING_SURVEY_HEARD_FROM_OPTIONS = [
  'Instagram',
  'Tiktok',
  'Reddit',
  'Youtube',
  'X (formerly Twitter)',
  'Search Engine',
  'AI recommendation',
  'A friend',
  'Facebook',
  'Other',
] as const

export const ONBOARDING_SURVEY_UGC_TYPE_OPTIONS = [
  'Videos for a tech product',
  'Videos for a fashion brand',
  'Videos for a physical product',
  'Generic lifestyle videos',
  'Others',
] as const

export const ONBOARDING_SURVEY_ROLE_OPTIONS = [
  'CEO',
  'Growth Marketer',
  'Software Engineer',
  'Product / Project Manager',
  'Other',
] as const

export const ONBOARDING_SURVEY_TEAM_SIZE_OPTIONS = [
  'Solo founder',
  '2-10',
  'More than 10',
] as const

export const AVATAR_VOICE_MAP: Record<number, string> = {
  0: 'rdDUoCO1RjwdMmNjmhHV',  // Marcus (M)
  1: 'kXsOSDWolD7e9l1Z0sbH',  // Sophie (F)
  2: 'dMyQqiVXTU80dDl2eNK8',  // Jade (F)
  3: 'BuaKXS4Sv1Mccaw3flfU',  // Aria (F)
  4: 'rdDUoCO1RjwdMmNjmhHV',  // Liam (M)
  5: 'kXsOSDWolD7e9l1Z0sbH',  // Zara (F)
  6: 'rdDUoCO1RjwdMmNjmhHV',  // Noah (M)
  7: 'dMyQqiVXTU80dDl2eNK8',  // Chloe (F)
  8: 'rdDUoCO1RjwdMmNjmhHV',  // Jordan (M)
  9: 'BuaKXS4Sv1Mccaw3flfU',  // Naomi (F)
  10: 'rdDUoCO1RjwdMmNjmhHV', // Andre (M)
  11: 'kXsOSDWolD7e9l1Z0sbH', // Mia (F)
  12: 'dMyQqiVXTU80dDl2eNK8', // Elena (F)
}
