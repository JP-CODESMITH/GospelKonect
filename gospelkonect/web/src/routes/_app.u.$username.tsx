import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { communityPosts, formatCount, people } from '../data/mock'
import { PostCard } from '../components/cards'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  useToast,
} from '../components/ui'

export const Route = createFileRoute('/_app/u/$username')({
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { username } = Route.useParams()
  const { push } = useToast()
  const person = people.find((item) => item.username === username)
  const [following, setFollowing] = useState(person?.following ?? false)

  if (!person) {
    return (
      <EmptyState
        title="Profile not found"
        description="This person may have changed their username or left the community."
        action={
          <Link
            to="/connect"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 font-body text-[14px] font-semibold text-on-primary"
          >
            Find people
          </Link>
        }
      />
    )
  }

  const posts = communityPosts.filter((post) => post.handle === person.username)

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <IconButton label="Go back" variant="surface" onClick={() => window.history.back()}>
          <ArrowLeft size={18} aria-hidden="true" />
        </IconButton>
        <IconButton label="Share profile" variant="surface" onClick={() => push('Profile link copied', 'success')}>
          <Share2 size={18} aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex flex-col items-center text-center">
        <Avatar name={person.name} gradient={person.gradient} size={88} ring />
        <h1 className="mt-3 flex items-center gap-1.5 font-display text-[24px] font-bold leading-7 tracking-[-0.01em] text-text">
          {person.name}
          {person.verified ? <BadgeCheck size={20} className="text-info" aria-label="Verified" /> : null}
        </h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">@{person.username}</p>
        <p className="mt-1 font-body text-[13px] font-medium text-primary">{person.church}</p>
        <p className="mt-1 flex items-center gap-1 font-body text-[12px] text-text-muted">
          <MapPin size={12} aria-hidden="true" /> {person.city}
        </p>

        <div className="mt-3 flex items-center gap-4">
          <span className="font-body text-[13px] text-text-muted">
            <span className="font-semibold text-text">{formatCount(person.followers)}</span> followers
          </span>
          <span className="font-body text-[13px] text-text-muted">
            <span className="font-semibold text-text">{formatCount(320)}</span> following
          </span>
          <span className="font-body text-[13px] text-text-muted">
            <span className="font-semibold text-text">{posts.length}</span> posts
          </span>
        </div>

        <div className="mt-4 flex w-full max-w-md gap-2">
          <Button
            variant={following ? 'soft' : 'primary'}
            fullWidth
            leftIcon={
              following ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />
            }
            onClick={() => {
              setFollowing((value) => !value)
              push(following ? `Unfollowed ${person.name}` : `Following ${person.name}`, 'success')
            }}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            leftIcon={<MessageCircle size={16} aria-hidden="true" />}
            onClick={() => push('Direct messages coming soon')}
          >
            Message
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" aria-hidden="true" />
          <h2 className="font-body text-[14px] font-semibold text-text">About</h2>
        </div>
        <p className="mt-2 font-body text-[13px] leading-[20px] text-text-muted">
          Part of the {person.church} family in {person.city}. Here to worship, grow and encourage others along the
          way.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="primary">{person.church}</Badge>
          <Badge tone="neutral">{person.city}</Badge>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 font-display text-[18px] font-semibold text-text">Posts</h2>
        {posts.length === 0 ? (
          <EmptyState
            icon={<Users size={38} aria-hidden="true" />}
            title="No posts yet"
            description={`When ${person.name.split(' ')[0]} shares something, it will show up here.`}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
