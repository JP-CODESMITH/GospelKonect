import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Image, Mic, Plus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  communityPosts,
  groups,
  guestUser,
  people,
  prayerRequests,
  type CommunityPost,
  type PrayerCategory,
  type PrayerRequest,
} from '../data/mock'
import { GroupCard, PersonRow, PostCard, PrayerCard } from '../components/cards'
import {
  BottomSheet,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  SearchField,
  SegmentedControl,
  Select,
  TextArea,
  useToast,
} from '../components/ui'

export const Route = createFileRoute('/_app/connect')({
  component: ConnectPage,
})

type Tab = 'feed' | 'prayer' | 'groups' | 'people'
type Audience = 'public' | 'church' | 'anonymous'

const TABS: { value: Tab; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'groups', label: 'Groups' },
  { value: 'people', label: 'People' },
]

const CATEGORIES: PrayerCategory[] = ['Healing', 'Family', 'Finance', 'Guidance', 'Thanksgiving']

function ConnectPage() {
  const { user } = useAuth()
  const { push } = useToast()
  const [tab, setTab] = useState<Tab>('feed')

  const [posts, setPosts] = useState<CommunityPost[]>(communityPosts)
  const [composerOpen, setComposerOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [audience, setAudience] = useState<Audience>('public')

  const [prayers, setPrayers] = useState<PrayerRequest[]>(prayerRequests)
  const [prayerText, setPrayerText] = useState('')
  const [prayerCategory, setPrayerCategory] = useState<PrayerCategory>('Guidance')
  const [anonymous, setAnonymous] = useState(false)

  const [peopleQuery, setPeopleQuery] = useState('')

  const authorName = user?.name ?? guestUser.name
  const authorHandle = user?.username ?? guestUser.username

  function submitPost() {
    const content = postText.trim()
    if (!content) return
    const post: CommunityPost = {
      id: `cp-${Date.now()}`,
      author: audience === 'anonymous' ? 'Anonymous' : authorName,
      handle: audience === 'anonymous' ? 'anonymous' : authorHandle,
      church: audience === 'church' ? guestUser.church : 'Public',
      time: 'Just now',
      content,
      verified: false,
      gradient: guestUser.gradient,
      amen: 0,
      comments: 0,
      shares: 0,
      saved: false,
      amened: false,
    }
    setPosts((prev) => [post, ...prev])
    setPostText('')
    setAudience('public')
    setComposerOpen(false)
    push('Your testimony is live', 'success')
  }

  function submitPrayer() {
    const text = prayerText.trim()
    if (!text) return
    const request: PrayerRequest = {
      id: `pr-${Date.now()}`,
      author: anonymous ? 'Anonymous' : authorName,
      city: 'Abuja',
      category: prayerCategory,
      text,
      prayed: 0,
      prayedByMe: false,
      time: 'Just now',
    }
    setPrayers((prev) => [request, ...prev])
    setPrayerText('')
    setAnonymous(false)
    push('Your prayer request is on the wall', 'success')
  }

  const filteredPeople = people.filter((person) =>
    `${person.name} ${person.church} ${person.city}`.toLowerCase().includes(peopleQuery.trim().toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Connect</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          A family of believers, one conversation at a time.
        </p>
      </div>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} label="Community sections" />

      {tab === 'feed' ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}

      {tab === 'prayer' ? (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-[17px] font-semibold text-text">Submit a prayer request</h2>
            <p className="mt-0.5 font-body text-[12px] text-text-muted">
              Let the community stand with you.
            </p>
            <TextArea
              className="mt-3"
              value={prayerText}
              onChange={(event) => setPrayerText(event.target.value)}
              placeholder="What would you like prayer for?"
              aria-label="Prayer request"
              maxLength={500}
            />
            <div className="mt-3">
              <Select
                label="Category"
                value={prayerCategory}
                onChange={(event) => setPrayerCategory(event.target.value as PrayerCategory)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Checkbox checked={anonymous} onChange={setAnonymous} label="Post anonymously" />
              <Button size="sm" disabled={!prayerText.trim()} onClick={submitPrayer}>
                Submit request
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {prayers.map((request) => (
              <PrayerCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'groups' ? (
        <div className="grid grid-cols-2 gap-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : null}

      {tab === 'people' ? (
        <div className="space-y-3">
          <SearchField
            value={peopleQuery}
            onChange={setPeopleQuery}
            placeholder="Search people, churches or cities…"
          />
          {filteredPeople.length === 0 ? (
            <EmptyState
              title="No one found"
              description="Try a different name, church or city."
            />
          ) : (
            <div>
              {filteredPeople.map((person) => (
                <PersonRow key={person.id} person={person} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'feed' ? (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          aria-label="Create a post"
          className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full gradient-signature text-white shadow-raised ring-4 ring-accent-soft transition-transform active:scale-95 md:bottom-24 md:right-8"
        >
          <Plus size={24} aria-hidden="true" />
        </button>
      ) : null}

      <BottomSheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Share with the community"
        footer={
          <Button fullWidth disabled={!postText.trim()} onClick={submitPost}>
            Post
          </Button>
        }
      >
        <TextArea
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          placeholder="Share a testimony, verse or prayer point…"
          aria-label="Post content"
          maxLength={1000}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip icon={<Image size={14} aria-hidden="true" />} onClick={() => push('Photo picker coming soon')}>
            Photo
          </Chip>
          <Chip icon={<Mic size={14} aria-hidden="true" />} onClick={() => push('Audio recording coming soon')}>
            Audio
          </Chip>
          <Chip icon={<BookOpen size={14} aria-hidden="true" />} onClick={() => push('Verse picker coming soon')}>
            Verse
          </Chip>
        </div>
        <div className="mt-4">
          <Select
            label="Post as"
            value={audience}
            onChange={(event) => setAudience(event.target.value as Audience)}
          >
            <option value="public">Public</option>
            <option value="church">My church</option>
            <option value="anonymous">Anonymous</option>
          </Select>
        </div>
        <p className="mt-2 text-right font-body text-[11px] text-text-muted">{postText.length}/1000</p>
      </BottomSheet>
    </div>
  )
}
