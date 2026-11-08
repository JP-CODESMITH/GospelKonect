import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, CreditCard, Globe, HandCoins, Quote, Smartphone } from 'lucide-react'
import { churches, formatDate } from '../data/mock'
import {
  Badge,
  Button,
  Card,
  Modal,
  SegmentedControl,
  Select,
  TextField,
  Toggle,
  useToast,
} from '../components/ui'
import { cn } from '../lib/cn'

export const Route = createFileRoute('/_app/give')({
  component: GivePage,
})

const PRESETS = [1000, 2500, 5000, 10000, 25000, 50000]

const METHODS = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'transfer', label: 'Transfer', icon: Globe },
  { id: 'ussd', label: 'USSD', icon: Smartphone },
] as const

const RECENT = [
  { id: 'g1', church: 'House on the Rock Abuja', amount: 5000, date: '2026-10-27', method: 'Card' },
  { id: 'g2', church: 'House on the Rock Abuja', amount: 2500, date: '2026-09-27', method: 'Transfer' },
  { id: 'g3', church: 'Winners Chapel Lagos', amount: 10000, date: '2026-08-24', method: 'Card' },
]

function naira(value: number): string {
  return `₦${value.toLocaleString('en-NG')}`
}

function GivePage() {
  const { push } = useToast()
  const [amountInput, setAmountInput] = useState('5000')
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once')
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('card')
  const [church, setChurch] = useState(churches[0]!.name)
  const [coverFees, setCoverFees] = useState(true)
  const [successOpen, setSuccessOpen] = useState(false)
  const [reference, setReference] = useState('')

  const base = Number(amountInput) || 0
  const fee = coverFees ? Math.round(base * 0.015) : 0
  const total = base + fee

  function give() {
    if (base <= 0) {
      push('Enter an amount to continue', 'error')
      return
    }
    setReference(`GK-${Date.now().toString().slice(-8)}`)
    setSuccessOpen(true)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] font-bold leading-[32px] tracking-[-0.01em] text-text">Give</h1>
        <p className="mt-0.5 font-body text-[13px] text-text-muted">
          Your generosity keeps the work of the ministry moving.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="gradient-signature px-4 py-5 text-white">
          <div className="flex items-center gap-2">
            <HandCoins size={18} aria-hidden="true" />
            <p className="font-body text-[12px] font-semibold uppercase tracking-[0.08em] text-white/85">
              {frequency === 'once' ? 'One-time gift' : 'Monthly partnership'}
            </p>
          </div>
          <p className="mt-2 font-display text-[32px] font-bold leading-none">{naira(total)}</p>
          <p className="mt-1 font-body text-[12px] text-white/80">
            {coverFees && fee > 0 ? `${naira(base)} gift + ${naira(fee)} processing` : 'No processing fee added'}
          </p>
        </div>

        <div className="space-y-4 p-4">
          <SegmentedControl
            options={[
              { value: 'once', label: 'One-time' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={frequency}
            onChange={setFrequency}
            label="Giving frequency"
          />

          <div>
            <p className="mb-2 font-body text-[13px] font-semibold text-text">Choose an amount</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={Number(amountInput) === preset}
                  onClick={() => setAmountInput(String(preset))}
                  className={cn(
                    'h-11 cursor-pointer rounded-md border font-body text-[13px] font-semibold transition-colors',
                    Number(amountInput) === preset
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-surface text-text hover:bg-surface-2',
                  )}
                >
                  {naira(preset)}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Amount (₦)"
            type="number"
            inputMode="numeric"
            min={100}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="Enter amount"
          />

          <Select label="Give to" value={church} onChange={(event) => setChurch(event.target.value)}>
            {churches.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-2 font-body text-[13px] font-semibold text-text">Payment method</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {METHODS.map((item) => {
                const Icon = item.icon
                const active = method === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(item.id)}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1.5 rounded-md border p-3 font-body text-[12px] font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-surface text-text-muted hover:bg-surface-2',
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5">
            <div>
              <p className="font-body text-[13px] font-medium text-text">Cover processing fees</p>
              <p className="font-body text-[11px] text-text-muted">So the full gift reaches the church.</p>
            </div>
            <Toggle checked={coverFees} onChange={setCoverFees} label="Cover processing fees" />
          </div>

          <Button fullWidth size="lg" onClick={give}>
            {frequency === 'once' ? `Give ${naira(total)}` : `Give ${naira(total)} monthly`}
          </Button>
          <p className="text-center font-body text-[11px] text-text-muted">
            Secure payment. {frequency === 'monthly' ? 'Cancel your partnership anytime.' : 'A receipt will be emailed to you.'}
          </p>
        </div>
      </Card>

      <Card className="flex gap-3 p-4">
        <Quote size={20} className="shrink-0 text-accent" aria-hidden="true" />
        <div>
          <p className="font-body text-[13px] italic leading-5 text-text">
            “Each of you should give what you have decided in your heart to give, not reluctantly or under
            compulsion, for God loves a cheerful giver.”
          </p>
          <p className="mt-1 font-body text-[11px] font-semibold text-text-muted">2 Corinthians 9:7</p>
        </div>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-text">Recent giving</h2>
          <Badge tone="neutral">This year</Badge>
        </div>
        <Card className="divide-y divide-border overflow-hidden">
          {RECENT.map((gift) => (
            <div key={gift.id} className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[14px] font-medium text-text">{gift.church}</p>
                <p className="font-body text-[11px] text-text-muted">
                  {formatDate(gift.date)} · {gift.method}
                </p>
              </div>
              <span className="font-body text-[13px] font-semibold text-text">{naira(gift.amount)}</span>
            </div>
          ))}
        </Card>
      </section>

      <Modal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Thank you"
        footer={
          <Button
            fullWidth
            onClick={() => {
              setSuccessOpen(false)
              push('Receipt sent to your email', 'success')
            }}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col items-center py-2 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <Check size={30} aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-[24px] font-bold text-text">{naira(total)}</p>
          <p className="mt-1 font-body text-[13px] text-text-muted">
            {frequency === 'once' ? 'Gift received' : 'Monthly partnership started'} · {church}
          </p>
          <p className="mt-3 rounded-full bg-surface-2 px-3 py-1 font-body text-[11px] text-text-muted">
            Ref {reference}
          </p>
          <p className="mt-4 font-body text-[12px] leading-5 text-text-muted">
            “God is not unjust; he will not forget your work and the love you have shown him.” Hebrews 6:10
          </p>
        </div>
      </Modal>
    </div>
  )
}
