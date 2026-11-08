/**
 * Mock content for the GospelKonect app shell.
 *
 * Everything here is plain data behind typed interfaces so it can be swapped
 * for the NestJS API (see `lib/api.ts`) without touching the screens. The
 * social surfaces already have a live client; music, sermons, events,
 * churches, groups and the prayer wall are mocked for now.
 */

export type Gradient = [from: string, to: string]

export interface Artist {
  id: string
  name: string
  city: string
  followers: number
  gradient: Gradient
}

export interface Song {
  id: string
  title: string
  artist: string
  artistId: string
  album: string
  duration: number
  plays: number
  gradient: Gradient
}

export interface Sermon {
  id: string
  title: string
  preacher: string
  preacherId: string
  church: string
  date: string
  duration: string
  gradient: Gradient
}

export interface EventItem {
  id: string
  title: string
  church: string
  venue: string
  city: string
  date: string
  time: string
  price: string
  attendees: number
  gradient: Gradient
  going: boolean
  description: string
}

export interface Church {
  id: string
  slug: string
  name: string
  denomination: string
  city: string
  members: number
  events: number
  sermons: number
  gradient: Gradient
  about: string
  serviceTimes: { day: string; times: string }[]
}

export interface Playlist {
  id: string
  name: string
  songCount: number
  gradient: Gradient
}

export type PrayerCategory = 'Healing' | 'Family' | 'Finance' | 'Guidance' | 'Thanksgiving'

export interface PrayerRequest {
  id: string
  author: string
  city: string
  category: PrayerCategory
  text: string
  prayed: number
  prayedByMe: boolean
  time: string
}

export interface CommunityPost {
  id: string
  author: string
  handle: string
  church: string
  time: string
  content: string
  verified: boolean
  gradient: Gradient
  media?: {
    kind: 'song' | 'sermon' | 'image'
    title: string
    subtitle: string
    gradient: Gradient
  }
  amen: number
  comments: number
  shares: number
  saved: boolean
  amened: boolean
}

export interface Group {
  id: string
  name: string
  members: number
  gradient: Gradient
  joined: boolean
}

export interface Person {
  id: string
  name: string
  username: string
  church: string
  city: string
  followers: number
  gradient: Gradient
  following: boolean
  verified: boolean
}

export type AlertKind = 'follow' | 'comment' | 'reaction' | 'event' | 'prayer'

export interface AppNotification {
  id: string
  actor: string
  text: string
  time: string
  unread: boolean
  kind: AlertKind
  gradient: Gradient
}

export interface Verse {
  text: string
  reference: string
}

const grad = (a: string, b: string): Gradient => [a, b]

export const verseOfTheDay: Verse = {
  text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters; He restores my soul.',
  reference: 'Psalm 23:1–3',
}

export const artists: Artist[] = [
  { id: 'a1', name: 'Sinach', city: 'Lagos', followers: 2_400_000, gradient: grad('#4B2E83', '#D9A441') },
  { id: 'a2', name: 'Nathaniel Bassey', city: 'Abuja', followers: 1_900_000, gradient: grad('#2F6FB3', '#4B2E83') },
  { id: 'a3', name: 'Mercy Chinwo', city: 'Port Harcourt', followers: 1_600_000, gradient: grad('#C8412F', '#D9A441') },
  { id: 'a4', name: 'Joe Praize', city: 'Abuja', followers: 980_000, gradient: grad('#2E8B57', '#D9A441') },
  { id: 'a5', name: 'Frank Edwards', city: 'Enugu', followers: 1_100_000, gradient: grad('#7B4FC4', '#2F6FB3') },
  { id: 'a6', name: 'Dunsin Oyekan', city: 'Ibadan', followers: 870_000, gradient: grad('#3C2369', '#C8412F') },
  { id: 'a7', name: 'Tope Alabi', city: 'Lagos', followers: 1_300_000, gradient: grad('#D98E04', '#4B2E83') },
  { id: 'a8', name: 'Ada Ehi', city: 'Lagos', followers: 1_050_000, gradient: grad('#2E8B57', '#2F6FB3') },
  { id: 'a9', name: 'Moses Bliss', city: 'Abuja', followers: 1_250_000, gradient: grad('#4B2E83', '#C8412F') },
  { id: 'a10', name: 'Victoria Orenze', city: 'Abuja', followers: 760_000, gradient: grad('#6A44B0', '#D9A441') },
]

export const songs: Song[] = [
  { id: 's1', title: 'Way Maker', artist: 'Sinach', artistId: 'a1', album: 'Way Maker', duration: 312, plays: 48_200_000, gradient: grad('#4B2E83', '#D9A441') },
  { id: 's2', title: 'Imela', artist: 'Nathaniel Bassey', artistId: 'a2', album: 'The King Is Here', duration: 421, plays: 31_800_000, gradient: grad('#2F6FB3', '#4B2E83') },
  { id: 's3', title: 'Excess Love', artist: 'Mercy Chinwo', artistId: 'a3', album: 'The Cross', duration: 289, plays: 27_400_000, gradient: grad('#C8412F', '#D9A441') },
  { id: 's4', title: 'Osinachi', artist: 'Joe Praize', artistId: 'a4', album: 'Osinachi', duration: 265, plays: 19_600_000, gradient: grad('#2E8B57', '#D9A441') },
  { id: 's5', title: 'You Are Great', artist: 'Frank Edwards', artistId: 'a5', album: 'Unlimited', duration: 298, plays: 16_900_000, gradient: grad('#7B4FC4', '#2F6FB3') },
  { id: 's6', title: 'Nobody', artist: 'Dunsin Oyekan', artistId: 'a6', album: 'Kingdom Now', duration: 356, plays: 14_300_000, gradient: grad('#3C2369', '#C8412F') },
  { id: 's7', title: 'Ekwueme', artist: 'Tope Alabi', artistId: 'a7', album: 'Ekwueme', duration: 334, plays: 12_800_000, gradient: grad('#D98E04', '#4B2E83') },
  { id: 's8', title: 'Awesome God', artist: 'Ada Ehi', artistId: 'a8', album: 'Born of God', duration: 301, plays: 11_500_000, gradient: grad('#2E8B57', '#2F6FB3') },
  { id: 's9', title: 'Too Faithful', artist: 'Moses Bliss', artistId: 'a9', album: 'Too Faithful', duration: 276, plays: 10_900_000, gradient: grad('#4B2E83', '#C8412F') },
  { id: 's10', title: 'Breathe', artist: 'Victoria Orenze', artistId: 'a10', album: 'The Presence', duration: 402, plays: 9_700_000, gradient: grad('#6A44B0', '#D9A441') },
  { id: 's11', title: 'Yeshua', artist: 'Sinach', artistId: 'a1', album: 'Way Maker', duration: 358, plays: 8_600_000, gradient: grad('#4B2E83', '#7B4FC4') },
  { id: 's12', title: 'This God Is Too Good', artist: 'Nathaniel Bassey', artistId: 'a2', album: 'The King Is Here', duration: 324, plays: 7_900_000, gradient: grad('#2F6FB3', '#D9A441') },
  { id: 's13', title: 'Onyedikagi', artist: 'Mercy Chinwo', artistId: 'a3', album: 'The Cross', duration: 245, plays: 7_100_000, gradient: grad('#C8412F', '#4B2E83') },
  { id: 's14', title: 'Carry Me', artist: 'Dunsin Oyekan', artistId: 'a6', album: 'Kingdom Now', duration: 367, plays: 6_400_000, gradient: grad('#3C2369', '#2F6FB3') },
  { id: 's15', title: 'Overflow', artist: 'Ada Ehi', artistId: 'a8', album: 'Born of God', duration: 288, plays: 5_800_000, gradient: grad('#2E8B57', '#D9A441') },
]

export const continueListening: Song[] = [songs[0]!, songs[5]!, songs[9]!, songs[3]!]

export const sermons: Sermon[] = [
  { id: 'm1', title: 'The God of Suddenly', preacher: 'Pastor E. A. Adeboye', preacherId: 'p1', church: 'RCCG', date: '2026-11-01', duration: '48 min', gradient: grad('#4B2E83', '#D9A441') },
  { id: 'm2', title: 'Prayer That Moves Mountains', preacher: 'Pastor Nathaniel Bassey', preacherId: 'p2', church: 'The King Is Here', date: '2026-10-26', duration: '55 min', gradient: grad('#2F6FB3', '#4B2E83') },
  { id: 'm3', title: 'Faith for the Impossible', preacher: 'Bishop David Oyedepo', preacherId: 'p3', church: 'Living Faith Church', date: '2026-10-19', duration: '42 min', gradient: grad('#2E8B57', '#D9A441') },
  { id: 'm4', title: 'The Sound of Revival', preacher: 'Pastor Dunsin Oyekan', preacherId: 'p4', church: 'The Elevation Church', date: '2026-10-12', duration: '39 min', gradient: grad('#3C2369', '#C8412F') },
  { id: 'm5', title: 'Grace That Sustains', preacher: 'Pastor Mercy Chinwo', preacherId: 'p5', church: 'House on the Rock', date: '2026-10-05', duration: '46 min', gradient: grad('#C8412F', '#D9A441') },
  { id: 'm6', title: 'When Worship Becomes War', preacher: 'Pastor Victoria Orenze', preacherId: 'p6', church: 'The Presence', date: '2026-09-28', duration: '51 min', gradient: grad('#6A44B0', '#D9A441') },
]

export const events: EventItem[] = [
  { id: 'e1', title: 'Worship Night Abuja', church: 'House on the Rock', venue: 'International Conference Centre', city: 'Abuja', date: '2026-11-14', time: '6:00 PM', price: 'Free', attendees: 1200, gradient: grad('#4B2E83', '#D9A441'), going: false, description: 'An evening of unrestrained worship with Sinach, Nathaniel Bassey and the Abuja Mass Choir. Doors open 5:30 PM.' },
  { id: 'e2', title: 'Hallelujah Challenge', church: 'The King Is Here', venue: 'Eko Convention Centre', city: 'Lagos', date: '2026-11-21', time: '7:00 PM', price: '₦5,000', attendees: 3400, gradient: grad('#2F6FB3', '#4B2E83'), going: true, description: 'A night of midnight praise and testimony with Nathaniel Bassey and friends.' },
  { id: 'e3', title: 'The Experience Lagos', church: 'House on the Rock', venue: 'Tafawa Balewa Square', city: 'Lagos', date: '2026-11-28', time: '5:00 PM', price: 'Free', attendees: 8600, gradient: grad('#C8412F', '#D9A441'), going: false, description: 'The largest gospel concert in Africa. A gathering of worshippers from across the nation.' },
  { id: 'e4', title: 'Praise Marathon PH', church: 'Salvation Ministries', venue: 'Salvation Ministries Camp', city: 'Port Harcourt', date: '2026-12-05', time: '4:00 PM', price: 'Free', attendees: 2100, gradient: grad('#2E8B57', '#D9A441'), going: false, description: 'Twelve hours of praise, prayer and the Word with Joe Praize and the PH Mass Choir.' },
  { id: 'e5', title: 'Kingdom Youth Summit', church: 'Living Faith Church', venue: 'Faith Tabernacle', city: 'Kaduna', date: '2026-12-12', time: '9:00 AM', price: '₦2,000', attendees: 780, gradient: grad('#7B4FC4', '#2F6FB3'), going: false, description: 'A day for young believers to grow in purpose, purity and power.' },
  { id: 'e6', title: 'Carols in the City', church: 'The Elevation Church', venue: 'Freedom Park', city: 'Lagos', date: '2026-12-24', time: '6:30 PM', price: 'Free', attendees: 1500, gradient: grad('#3C2369', '#C8412F'), going: false, description: 'A candlelit evening of carols, choir and community for the whole family.' },
  { id: 'e7', title: 'New Year Praise', church: 'House on the Rock Abuja', venue: 'This Present House', city: 'Abuja', date: '2026-12-31', time: '10:00 PM', price: 'Free', attendees: 1900, gradient: grad('#D98E04', '#4B2E83'), going: false, description: 'Cross over into the new year with thanksgiving, worship and the Word.' },
]

export const churches: Church[] = [
  { id: 'c1', slug: 'house-on-the-rock-abuja', name: 'House on the Rock Abuja', denomination: 'Non-denominational', city: 'Abuja', members: 12_400, events: 8, sermons: 214, gradient: grad('#4B2E83', '#D9A441'), about: 'A family of believers committed to worship, the Word and community. We gather every Sunday to encounter God together.', serviceTimes: [{ day: 'Sunday', times: '8:00 AM · 10:30 AM' }, { day: 'Wednesday', times: '6:00 PM' }, { day: 'Friday', times: '7:00 PM' }] },
  { id: 'c2', slug: 'winners-chapel-lagos', name: 'Winners Chapel Lagos', denomination: 'Pentecostal', city: 'Lagos', members: 38_000, events: 12, sermons: 640, gradient: grad('#2F6FB3', '#4B2E83'), about: 'A place of faith, miracles and the undiluted Word of God. Everyone is welcome.', serviceTimes: [{ day: 'Sunday', times: '7:00 AM · 9:00 AM · 11:00 AM' }, { day: 'Tuesday', times: '6:30 PM' }] },
  { id: 'c3', slug: 'salvation-ministries-ph', name: 'Salvation Ministries', denomination: 'Pentecostal', city: 'Port Harcourt', members: 21_000, events: 6, sermons: 320, gradient: grad('#2E8B57', '#D9A441'), about: 'Raising a people of praise and power in the heart of Port Harcourt.', serviceTimes: [{ day: 'Sunday', times: '8:00 AM · 10:00 AM' }, { day: 'Thursday', times: '6:00 PM' }] },
  { id: 'c4', slug: 'living-faith-kaduna', name: 'Living Faith Church Kaduna', denomination: 'Word of Faith', city: 'Kaduna', members: 9_800, events: 5, sermons: 180, gradient: grad('#7B4FC4', '#2F6FB3'), about: 'A church built on faith, the Word and the covenant. Come as you are.', serviceTimes: [{ day: 'Sunday', times: '8:30 AM · 10:30 AM' }, { day: 'Wednesday', times: '5:30 PM' }] },
  { id: 'c5', slug: 'the-elevation-church-lagos', name: 'The Elevation Church Lagos', denomination: 'Contemporary', city: 'Lagos', members: 16_500, events: 10, sermons: 260, gradient: grad('#3C2369', '#C8412F'), about: 'A modern church for a modern city, rooted in the ancient gospel.', serviceTimes: [{ day: 'Sunday', times: '9:00 AM · 11:30 AM' }, { day: 'Friday', times: '7:00 PM' }] },
]

export const playlists: Playlist[] = [
  { id: 'pl1', name: 'Sunday Morning Praise', songCount: 32, gradient: grad('#4B2E83', '#D9A441') },
  { id: 'pl2', name: 'Deep Worship', songCount: 24, gradient: grad('#2F6FB3', '#4B2E83') },
  { id: 'pl3', name: 'Choir Classics', songCount: 41, gradient: grad('#2E8B57', '#D9A441') },
  { id: 'pl4', name: 'Afro Gospel Hits', songCount: 28, gradient: grad('#C8412F', '#D9A441') },
  { id: 'pl5', name: 'Instrumental Devotion', songCount: 18, gradient: grad('#6A44B0', '#D9A441') },
  { id: 'pl6', name: 'Midnight Praise', songCount: 36, gradient: grad('#3C2369', '#2F6FB3') },
]

export const genres = [
  { name: 'Praise', gradient: grad('#4B2E83', '#D9A441') },
  { name: 'Worship', gradient: grad('#2F6FB3', '#4B2E83') },
  { name: 'Contemporary', gradient: grad('#2E8B57', '#D9A441') },
  { name: 'Choir', gradient: grad('#C8412F', '#D9A441') },
  { name: 'Highlife Gospel', gradient: grad('#D98E04', '#4B2E83') },
  { name: 'Hymns', gradient: grad('#3C2369', '#7B4FC4') },
  { name: 'Afro Gospel', gradient: grad('#7B4FC4', '#2F6FB3') },
  { name: 'Instrumental', gradient: grad('#6A44B0', '#D9A441') },
] as const

export const prayerRequests: PrayerRequest[] = [
  { id: 'pr1', author: 'Chiamaka O.', city: 'Abuja', category: 'Healing', text: 'Please stand with me in prayer for my mother’s recovery after surgery. The doctors are hopeful, and we are trusting God for complete healing.', prayed: 248, prayedByMe: false, time: '2h ago' },
  { id: 'pr2', author: 'Anonymous', city: 'Lagos', category: 'Guidance', text: 'I am at a crossroads with my career. I need clarity and peace about the next step. Praying for direction.', prayed: 132, prayedByMe: false, time: '4h ago' },
  { id: 'pr3', author: 'Emeka N.', city: 'Port Harcourt', category: 'Finance', text: 'Believing God for provision for my family this month. Thank you for standing with us.', prayed: 96, prayedByMe: true, time: '6h ago' },
  { id: 'pr4', author: 'Aisha B.', city: 'Kaduna', category: 'Thanksgiving', text: 'God answered our prayers — my brother passed his exams and got the job! Giving thanks with you all.', prayed: 310, prayedByMe: false, time: '9h ago' },
  { id: 'pr5', author: 'Tunde A.', city: 'Ibadan', category: 'Family', text: 'Praying for peace and unity in my home. That love and patience would guard our words.', prayed: 174, prayedByMe: false, time: '12h ago' },
]

export const groups: Group[] = [
  { id: 'g1', name: 'Prayer Warriors', members: 4_200, gradient: grad('#4B2E83', '#D9A441'), joined: true },
  { id: 'g2', name: 'Choir & Worship', members: 2_800, gradient: grad('#2F6FB3', '#4B2E83'), joined: false },
  { id: 'g3', name: 'Young Believers', members: 3_600, gradient: grad('#2E8B57', '#D9A441'), joined: false },
  { id: 'g4', name: 'Mothers in Prayer', members: 1_900, gradient: grad('#C8412F', '#D9A441'), joined: true },
  { id: 'g5', name: 'Scripture Daily', members: 5_100, gradient: grad('#7B4FC4', '#2F6FB3'), joined: false },
  { id: 'g6', name: 'Campus Fellowship', members: 2_300, gradient: grad('#6A44B0', '#D9A441'), joined: false },
]

export const communityPosts: CommunityPost[] = [
  { id: 'cp1', author: 'Chiamaka Okafor', handle: 'chiamaka', church: 'House on the Rock Abuja', time: '2h', content: 'God showed up at our worship night last Friday. The presence of the Lord was so tangible — we sang “Way Maker” for almost twenty minutes and nobody wanted to leave. Sharing this to encourage someone: He is still in the room.', verified: true, gradient: grad('#4B2E83', '#D9A441'), media: { kind: 'song', title: 'Way Maker', subtitle: 'Sinach · 5:12', gradient: grad('#4B2E83', '#D9A441') }, amen: 342, comments: 28, shares: 14, saved: false, amened: false },
  { id: 'cp2', author: 'Pastor Emeka Nwosu', handle: 'emeka', church: 'Winners Chapel Lagos', time: '4h', content: '“The Lord is my shepherd; I shall not want.” Psalm 23:1. Whatever you are carrying today, let this truth settle over you. You are seen. You are led. You are provided for.', verified: true, gradient: grad('#2F6FB3', '#4B2E83'), amen: 518, comments: 41, shares: 63, saved: true, amened: true },
  { id: 'cp3', author: 'Tunde Adeyemi', handle: 'tunde', church: 'The Elevation Church Lagos', time: '6h', content: 'Testimony time! After months of waiting, I got the job. God is faithful, and He is never late. Thank you to everyone who prayed with me on this wall.', verified: false, gradient: grad('#2E8B57', '#D9A441'), amen: 276, comments: 35, shares: 9, saved: false, amened: false },
  { id: 'cp4', author: 'Aisha Bello', handle: 'aisha', church: 'Living Faith Church Kaduna', time: '9h', content: 'Carols rehearsal started today and the children are already so excited. If you are in Kaduna, join us on the 24th — it is going to be a beautiful evening of worship.', verified: false, gradient: grad('#C8412F', '#D9A441'), media: { kind: 'sermon', title: 'Carols in the City', subtitle: 'The Elevation Church · Dec 24', gradient: grad('#3C2369', '#C8412F') }, amen: 129, comments: 12, shares: 21, saved: false, amened: false },
]

export const people: Person[] = [
  { id: 'u1', name: 'Chiamaka Okafor', username: 'chiamaka', church: 'House on the Rock Abuja', city: 'Abuja', followers: 12_400, gradient: grad('#4B2E83', '#D9A441'), following: false, verified: true },
  { id: 'u2', name: 'Emeka Nwosu', username: 'emeka', church: 'Winners Chapel Lagos', city: 'Lagos', followers: 8_900, gradient: grad('#2F6FB3', '#4B2E83'), following: true, verified: true },
  { id: 'u3', name: 'Aisha Bello', username: 'aisha', church: 'Living Faith Church Kaduna', city: 'Kaduna', followers: 4_200, gradient: grad('#2E8B57', '#D9A441'), following: false, verified: false },
  { id: 'u4', name: 'Tunde Adeyemi', username: 'tunde', church: 'The Elevation Church Lagos', city: 'Lagos', followers: 2_800, gradient: grad('#C8412F', '#D9A441'), following: false, verified: false },
  { id: 'u5', name: 'Blessing Eze', username: 'blessing', church: 'Salvation Ministries PH', city: 'Port Harcourt', followers: 6_100, gradient: grad('#7B4FC4', '#2F6FB3'), following: false, verified: false },
  { id: 'u6', name: 'Daniel Musa', username: 'daniel', church: 'House on the Rock Abuja', city: 'Abuja', followers: 3_400, gradient: grad('#6A44B0', '#D9A441'), following: false, verified: false },
]

export const notifications: AppNotification[] = [
  { id: 'n1', actor: 'Chiamaka Okafor', text: 'started following you.', time: '12m', unread: true, kind: 'follow', gradient: grad('#4B2E83', '#D9A441') },
  { id: 'n2', actor: 'Emeka Nwosu', text: 'commented on your testimony.', time: '1h', unread: true, kind: 'comment', gradient: grad('#2F6FB3', '#4B2E83') },
  { id: 'n3', actor: 'Aisha Bello', text: 'said Amen to your prayer request.', time: '3h', unread: true, kind: 'reaction', gradient: grad('#2E8B57', '#D9A441') },
  { id: 'n4', actor: 'Worship Night Abuja', text: 'is happening in 6 days. RSVP now.', time: '5h', unread: false, kind: 'event', gradient: grad('#4B2E83', '#D9A441') },
  { id: 'n5', actor: 'Prayer Wall', text: 'Someone prayed for your request.', time: 'Yesterday', unread: false, kind: 'prayer', gradient: grad('#C8412F', '#D9A441') },
  { id: 'n6', actor: 'Tunde Adeyemi', text: 'shared your post.', time: 'Yesterday', unread: false, kind: 'comment', gradient: grad('#C8412F', '#D9A441') },
]

export const trendingSearches = [
  'Sinach',
  'Worship Night Abuja',
  'Nathaniel Bassey',
  'Prayer for healing',
  'The Experience Lagos',
  'Mercy Chinwo',
]

export const recentSearches = ['Way Maker', 'House on the Rock', 'Choir music', 'Kaduna events']

export const quickActions = [
  { id: 'live', label: 'Live Now', icon: 'radio', tone: 'primary' },
  { id: 'prayer', label: 'Prayer Wall', icon: 'hands', tone: 'accent' },
  { id: 'sermons', label: 'Sermons', icon: 'book', tone: 'primary' },
  { id: 'give', label: 'Give', icon: 'coins', tone: 'accent' },
] as const

export const guestUser = {
  name: 'Grace Adeyemi',
  username: 'grace',
  church: 'House on the Rock Abuja',
  city: 'Abuja',
  gradient: grad('#4B2E83', '#D9A441') as Gradient,
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Locale-independent formatting keeps SSR and client markup identical. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function formatFullDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return MONTHS[d.getUTCMonth()]!.toUpperCase()
}

export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return String(d.getUTCDate()).padStart(2, '0')
}

export { MONTHS, WEEKDAYS }
