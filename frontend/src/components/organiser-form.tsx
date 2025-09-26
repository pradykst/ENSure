"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

function SectionTitle({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 shrink-0 border rounded-sm grid place-items-center text-xs font-medium">{index}</div>
      <h2 className="text-lg md:text-xl font-medium">{title}</h2>
    </div>
  )
}

type PrizeSplit = { position: number; amount: number }
type Judge = { name: string }
type Faq = { q: string; a: string }

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function toNumber(val: string) {
  const cleaned = val.replace(/[^\d.-]/g, "")
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function OrganizerForm() {
  // Event basics
  const [name, setName] = React.useState("ENSure Hackathon 2025")
  const [description, setDescription] = React.useState(
    "Build projects with ENS and related tooling. Ship fast, learn together, and win prizes.",
  )
  const [location, setLocation] = React.useState("New York City, NY • The Glasshouse")

  // Timeline (ISO date inputs)
  const todayISO = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const in9 = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10)
  const in12 = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)
  const [registrationEnd, setRegistrationEnd] = React.useState(in7)
  const [eventStart, setEventStart] = React.useState(in9)
  const [eventEnd, setEventEnd] = React.useState(in12)
  const [resultsDate, setResultsDate] = React.useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))

  // Judges
  const [judges, setJudges] = React.useState<Judge[]>([{ name: "Jane Doe" }, { name: "John Appleseed" }])

  // Prize pool & split
  const [prizePool, setPrizePool] = React.useState<number>(8000)
  const [prizeSplit, setPrizeSplit] = React.useState<PrizeSplit[]>([
    { position: 1, amount: 5000 },
    { position: 2, amount: 3000 },
  ])
  const totalSplit = prizeSplit.reduce((s, p) => s + (p.amount || 0), 0)
  const remaining = Math.max(0, prizePool - totalSplit)
  const splitMatches = prizePool === totalSplit

  // FAQ
  const [faq, setFaq] = React.useState<Faq[]>([
    { q: "Who can participate?", a: "Anyone with an interest in building with ENS." },
    { q: "What is the team size?", a: "1–4 people per team." },
  ])

  // JSON Preview
  const jsonPayload = React.useMemo(() => {
    return {
      name,
      prizeSplit: prizeSplit.map((p) => ({ position: p.position, amount: p.amount })),
      participants: [] as string[], // intentionally empty per request
      registrationEnd,
      resultsDate,
    }
  }, [name, prizeSplit, registrationEnd, resultsDate])

  const jsonText = React.useMemo(() => JSON.stringify(jsonPayload, null, 2), [jsonPayload])

  function downloadJSON() {
    if (!splitMatches) {
      alert("Your prize split must equal the prize pool before downloading.")
      return
    }
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fname = `${
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "ensure-event"
    }.json`
    link.href = url
    link.download = fname
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        {/* 1. Event details */}
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle index={1} title="Event details" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name of the event</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ENSure Winter Hackathon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Venue or Online"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event, what to expect, and any requirements."
                className="min-h-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Prize Pool */}
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle index={2} title="Prize pool & split" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prize-pool">Prize pool (USD)</Label>
                <Input
                  id="prize-pool"
                  inputMode="numeric"
                  value={prizePool}
                  onChange={(e) => setPrizePool(toNumber(e.target.value))}
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Summary</Label>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center rounded-sm border px-2 py-1">
                    Total: {formatMoney(prizePool)}
                  </span>
                  <span className="inline-flex items-center rounded-sm border px-2 py-1">
                    Allocated: {formatMoney(totalSplit)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-sm border px-2 py-1",
                      remaining === 0 ? "border-green-600 text-green-600" : "",
                    )}
                  >
                    Remaining: {formatMoney(prizePool - totalSplit)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              {prizeSplit.map((row, idx) => (
                <div key={row.position} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-5 md:col-span-4">
                    <Label className="sr-only">Position</Label>
                    <Input value={`${ordinal(row.position)} place`} readOnly />
                  </div>
                  <div className="col-span-7 md:col-span-6">
                    <Label className="sr-only">Amount</Label>
                    <Input
                      inputMode="numeric"
                      value={row.amount}
                      onChange={(e) => {
                        const next = [...prizeSplit]
                        next[idx] = { ...next[idx], amount: toNumber(e.target.value) }
                        setPrizeSplit(next)
                      }}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-2 flex gap-2 md:justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const next = [...prizeSplit]
                        next.splice(idx, 1)
                        setPrizeSplit(next.map((p, i) => ({ ...p, position: i + 1 })))
                      }}
                      disabled={prizeSplit.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setPrizeSplit((prev) => [
                      ...prev,
                      { position: prev.length + 1, amount: Math.max(0, Math.floor(remaining)) },
                    ])
                  }
                >
                  + Add prize
                </Button>
                <div className={cn("text-sm", splitMatches ? "text-green-600" : "text-destructive")}>
                  {splitMatches ? "Split equals the prize pool." : "Split must equal the prize pool to export JSON."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Judges */}
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle index={3} title="Judges" />
          </CardHeader>
          <CardContent className="space-y-3">
            {judges.map((j, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-9 md:col-span-10">
                  <Label className="sr-only">Judge name</Label>
                  <Input
                    value={j.name}
                    onChange={(e) => {
                      const next = [...judges]
                      next[idx] = { name: e.target.value }
                      setJudges(next)
                    }}
                    placeholder="Full name"
                  />
                </div>
                <div className="col-span-3 md:col-span-2 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next = [...judges]
                      next.splice(idx, 1)
                      setJudges(next)
                    }}
                    disabled={judges.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setJudges((p) => [...p, { name: "" }])}>
              + Add judge
            </Button>
          </CardContent>
        </Card>

        {/* 4. Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle index={4} title="Timeline" />
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Registration end</Label>
              <Input
                type="date"
                value={registrationEnd}
                min={todayISO}
                onChange={(e) => setRegistrationEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Event start</Label>
              <Input type="date" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Event end</Label>
              <Input type="date" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Results date</Label>
              <Input type="date" value={resultsDate} onChange={(e) => setResultsDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* 5. FAQ */}
        <Card>
          <CardHeader className="pb-3">
            <SectionTitle index={5} title="FAQ" />
          </CardHeader>
          <CardContent className="space-y-4">
            {faq.map((item, idx) => (
              <div key={idx} className="grid gap-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="sr-only">Question</Label>
                    <Input
                      value={item.q}
                      onChange={(e) => {
                        const next = [...faq]
                        next[idx] = { ...next[idx], q: e.target.value }
                        setFaq(next)
                      }}
                      placeholder="Question"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="sr-only">Answer</Label>
                    <Input
                      value={item.a}
                      onChange={(e) => {
                        const next = [...faq]
                        next[idx] = { ...next[idx], a: e.target.value }
                        setFaq(next)
                      }}
                      placeholder="Answer"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next = [...faq]
                      next.splice(idx, 1)
                      setFaq(next)
                    }}
                    disabled={faq.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
                <Separator />
              </div>
            ))}
            <Button variant="outline" onClick={() => setFaq((p) => [...p, { q: "", a: "" }])}>
              + Add FAQ
            </Button>
          </CardContent>
        </Card>

        {/* 6. Save / Export */}
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={downloadJSON}
            disabled={!splitMatches}
            className="px-5"
            title={!splitMatches ? "Split must equal total to export" : "Download JSON"}
          >
            Download JSON
          </Button>
        </div>
      </div>

      {/* Right rail: JSON Preview */}
      <div className="md:col-span-1">
        <Card className="sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">JSON Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">
              Exports only: name, prizeSplit, participants [], registrationEnd, resultsDate.
            </div>
            <Textarea value={jsonText} readOnly className="font-mono text-xs leading-5 min-h-[420px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
