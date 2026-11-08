import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Bookmark, Headphones, Pencil, Settings, Share2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { communityPosts, guestUser } from '../data/mock'
import { PostCard } from '../components/cards'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Modal,
  Tabs,
  TextArea,
  TextField,
  useToast,
} from '../components/ui'

export const Route = createFileRoute('/_app/profile')({
  component: ProfilePage,
})

type ProfileTab = 'posts' | 'testimonies' | 'saved'

function ProfilePage() {
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<ProfileTab>('posts')
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(user?.name ?? guestUser.name)
  const [editBio, setEditBio] = useState(
    user?.bio ?? 'Lover of worship, prayer and the Word. Finding God in the everyday.',
  )
  const [savedName, setSavedName] = useState(user?.name ?? guestUser.name)
  const [savedBio, setSavedBio] = useState(
    user?.bio ?? 'Lover of worship, prayer and the Word. Finding God in the everyday.',
  )

  const name = savedName
  const username = user?.username ?? guestUser.username
  const stats = [
    { label: 'Followers', value: 1240 },
    { label: 'Following', value: 320 },
    { label: 'Prayers', value: 86 },
    { label: 'Posts', value: 42 },
  ]

  const posts =
    tab === 'saved'
      ? communityPosts.filter((post) => post.saved)
      : tab === 'testimonies'
        ? communityPosts.filter((post) => ['cp1', 'cp3'].includes(post.id))
        : communityPosts

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-1">
        <IconButton label="Share profile" variant="surface" onClick={() => push('Profile link copied', 'success')}>
          <Share2 size={18} aria-hidden="true" />
        </IconButton>
        <Link
          to="/settings"
          aria-label="Settings"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-surface-2"
        >
          <Settings size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col items-center text-center">
        <Avatar name={name} gradient={guestUser.gradient} size={88} ring />
        <h1 className="mt-3 font-display text-[24px] font-bold leading-7 tracking-[-0.01em] text-text">{name}</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">@{username}</p>
        <p className="mt-1 font-body text-[13px] font-medium text-primary">{guestUser.church}</p>
        <p className="mt-2 max-w-md font-body text-[14px] leading-[22px] text-text-muted">{savedBio}</p>

        <div className="mt-4 grid w-full max-w-md grid-cols-4 divide-x divide-border rounded-lg border border-border bg-surface py-3 shadow-card">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-display text-[18px] font-bold text-text">{stat.value}</span>
              <span className="mt-0.5 font-body text-[11px] text-text-muted">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex w-full max-w-md gap-2">
          <Button
            variant="secondary"
            fullWidth
            leftIcon={<Pencil size={15} aria-hidden="true" />}
            onClick={() => {
              setEditName(savedName)
              setEditBio(savedBio)
              setEditOpen(true)
            }}
          >
            Edit profile
          </Button>
          <Button
            variant="soft"
            fullWidth
            leftIcon={<Headphones size={15} aria-hidden="true" />}
            onClick={() => void navigate({ to: '/library' })}
          >
            Library
          </Button>
        </div>
      </div>

      <Tabs
        options={[
          { value: 'posts', label: 'Posts', count: 42 },
          { value: 'testimonies', label: 'Testimonies', count: 12 },
          { value: 'saved', label: 'Saved', count: communityPosts.filter((post) => post.saved).length },
        ]}
        value={tab}
        onChange={setTab}
        label="Profile sections"
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={38} aria-hidden="true" />}
          title="Nothing saved yet"
          description="Tap the bookmark on any post to keep it here."
          action={
            <Link
              to="/connect"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-body text-[14px] font-semibold text-on-primary"
            >
              Explore community
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <Link to="/library" className="block">
          <ListRow
            icon={<Headphones size={18} aria-hidden="true" />}
            title="Your library"
            subtitle="Downloads, liked songs and playlists"
          />
        </Link>
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        footer={
          <Button
            fullWidth
            onClick={() => {
              setSavedName(editName.trim() || savedName)
              setSavedBio(editBio.trim())
              setEditOpen(false)
              push('Profile updated', 'success')
            }}
          >
            Save changes
          </Button>
        }
      >
        <div className="space-y-3">
          <TextField label="Full name" value={editName} onChange={(event) => setEditName(event.target.value)} />
          <TextArea label="Bio" value={editBio} onChange={(event) => setEditBio(event.target.value)} maxLength={160} />
        </div>
      </Modal>
    </div>
  )
}
