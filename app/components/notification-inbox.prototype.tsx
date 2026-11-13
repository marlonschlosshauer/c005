// THROWAWAY: three inbox layouts on /dashboard?variant=A|B|C.
// Question: which entry point, reading flow, and preference presentation fit Cadence?
// Mock data and in-memory actions only. Not a production notification implementation.
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronLeft,
  Mail,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";

type Persona =
  "Student" | "Instructor" | "Platform Admin" | "Team Admin" | "Mixed roles";
type Mode = "normal" | "empty" | "error" | "loading";
type Notice = {
  id: number;
  type: string;
  title: string;
  body: string;
  context: string;
  destination: string;
  age: string;
  read: boolean;
  audience: Persona;
};
const types = [
  {
    id: "purchase",
    name: "My Purchase confirmations",
    group: "Purchases and refunds",
    required: true,
  },
  {
    id: "refund",
    name: "My Refund Request updates",
    group: "Purchases and refunds",
    required: true,
  },
  {
    id: "sale",
    name: "New Purchases of my courses",
    group: "Teaching",
    required: false,
  },
  {
    id: "question",
    name: "New lesson questions",
    group: "Teaching",
    required: false,
  },
  {
    id: "reply",
    name: "Replies to lesson discussions",
    group: "Discussions",
    required: false,
  },
  {
    id: "rating",
    name: "Ratings of my courses",
    group: "Teaching",
    required: false,
  },
  {
    id: "seat",
    name: "Seats claimed on my Team Licences",
    group: "Teams",
    required: false,
  },
  {
    id: "review",
    name: "New Refund Requests to review",
    group: "Platform administration",
    required: false,
  },
  {
    id: "completion",
    name: "My lesson completions",
    group: "Learning",
    required: false,
  },
  { id: "quiz", name: "My quiz results", group: "Learning", required: false },
];
const seeds: Omit<Notice, "id" | "read" | "age">[] = [
  {
    type: "reply",
    title: "Your question has a new reply",
    body: "Alex replied: ‘Try narrowing the union before accessing the property.’",
    context: "Practical TypeScript · Narrowing",
    destination: "Lesson discussion → your question",
    audience: "Student",
  },
  {
    type: "refund",
    title: "Your Refund Request was approved",
    body: "Your request for Practical React was approved. This confirms the decision, not the arrival of your money.",
    context: "Practical React · Individual Purchase",
    destination: "Settings → your Purchase and Refund Request",
    audience: "Student",
  },
  {
    type: "quiz",
    title: "Quiz result: 8 of 10 correct",
    body: "You passed this attempt. You can review your answers in the lesson.",
    context: "Practical TypeScript · Attempt 2",
    destination: "Lesson → quiz result",
    audience: "Student",
  },
  {
    type: "completion",
    title: "You completed Narrowing",
    body: "Another lesson completed. Continue when you’re ready.",
    context: "Practical TypeScript · Narrowing",
    destination: "Completed lesson",
    audience: "Student",
  },
  {
    type: "purchase",
    title: "Your Purchase is confirmed",
    body: "You can now start Practical TypeScript.",
    context: "Practical TypeScript · Individual Purchase",
    destination: "Course welcome",
    audience: "Student",
  },
  {
    type: "sale",
    title: "A new Purchase of your course",
    body: "Jamie purchased Practical TypeScript.",
    context: "Practical TypeScript · Individual Purchase",
    destination: "Instructor → course Students",
    audience: "Instructor",
  },
  {
    type: "question",
    title: "A new question needs your attention",
    body: "Sam asked: ‘Why does this type become never?’",
    context: "Practical TypeScript · Narrowing",
    destination: "Instructor → unanswered questions",
    audience: "Instructor",
  },
  {
    type: "rating",
    title: "Your course received a 5-star rating",
    body: "Morgan rated Practical TypeScript.",
    context: "Practical TypeScript",
    destination: "Course → ratings",
    audience: "Instructor",
  },
  {
    type: "reply",
    title: "A lesson discussion has a new reply",
    body: "Sam added a follow-up to the discussion.",
    context: "Practical TypeScript · Narrowing",
    destination: "Lesson discussion → question",
    audience: "Instructor",
  },
  {
    type: "sale",
    title: "A new Team Licence Purchase",
    body: "Acme’s buyer purchased 8 Seats for your course.",
    context: "Practical TypeScript · Team Licence",
    destination: "Instructor → course Students",
    audience: "Instructor",
  },
  {
    type: "review",
    title: "A new Refund Request needs review",
    body: "Jamie requested a refund for Practical React.",
    context: "Practical React · Individual Purchase",
    destination: "Platform Admin → Refund Requests",
    audience: "Platform Admin",
  },
  {
    type: "review",
    title: "A Team Licence Refund Request needs review",
    body: "Acme’s buyer requested a refund for 8 Unclaimed Seats.",
    context: "Practical TypeScript · Team Licence",
    destination: "Platform Admin → Refund Requests",
    audience: "Platform Admin",
  },
  {
    type: "seat",
    title: "A Seat on your Team Licence was claimed",
    body: "Taylor claimed a Seat for Practical TypeScript.",
    context: "Practical TypeScript · Team Licence",
    destination: "Team → Team Licence Seats",
    audience: "Team Admin",
  },
  {
    type: "refund",
    title: "Your Refund Request was received",
    body: "A Platform Admin will review your request. Unclaimed Seats are on hold while it is open.",
    context: "Practical React · Team Licence",
    destination: "Team → Team Licence Refund Request",
    audience: "Team Admin",
  },
  {
    type: "purchase",
    title: "Your Team Licence Purchase is confirmed",
    body: "Your 8 Seats are ready to share. This Purchase does not enroll you on the course.",
    context: "Practical TypeScript · Team Licence",
    destination: "Team → Team Licence Seats",
    audience: "Team Admin",
  },
];
function initialNotices(): Notice[] {
  return seeds.map((n, i) => ({
    ...n,
    id: i + 1,
    read: i % 3 === 2,
    age: i < 3 ? `${i + 2} minutes ago` : `${i + 1} hours ago`,
  }));
}
const names = {
  A: "Bell + compact panel",
  B: "Full-page inbox",
  C: "Split list + detail",
};
const groups = [...new Set(types.map((t) => t.group))];

export function NotificationInboxPrototype({
  children,
}: {
  children: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const key = params.get("variant") ?? "A";
  const variant = key in names ? (key as keyof typeof names) : "A";
  const [persona, setPersona] = useState<Persona>("Student");
  const [notices, setNotices] = useState(initialNotices);
  const [mode, setMode] = useState<Mode>("normal");
  const [panel, setPanel] = useState(true);
  const [screen, setScreen] = useState<"inbox" | "preferences">("inbox");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [limit, setLimit] = useState(4);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<
    Record<string, { inApp: boolean; email: boolean }>
  >(() =>
    Object.fromEntries(types.map((t) => [t.id, { inApp: true, email: true }]))
  );
  const [feedback, setFeedback] = useState("");
  const mine = notices.filter(
    (n) => persona === "Mixed roles" || n.audience === persona
  );
  const unread = mode === "empty" ? 0 : mine.filter((n) => !n.read).length;
  const filtered =
    mode === "empty" ? [] : mine.filter((n) => filter === "all" || !n.read);
  const selected = mine.find((n) => n.id === selectedId);
  function cycle(offset: number) {
    const keys = Object.keys(names);
    const next =
      keys[(keys.indexOf(variant) + offset + keys.length) % keys.length];
    setParams(
      (previous) => {
        previous.set("variant", next);
        return previous;
      },
      { replace: true, preventScrollReset: true }
    );
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "input, textarea, select, button, [contenteditable], [role='switch']"
        ) ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        cycle(e.key === "ArrowLeft" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    setSelectedId(null);
    setLimit(4);
    setFeedback("");
  }, [persona]);
  function read(id: number, value: boolean) {
    setNotices((ns) =>
      ns.map((n) => (n.id === id ? { ...n, read: value } : n))
    );
  }
  function open(n: Notice) {
    read(n.id, true);
    setSelectedId(n.id);
  }
  function arrival() {
    const sample = mine[0] ?? seeds[0];
    if (!preferences[sample.type].inApp) {
      setFeedback("No inbox item added: in-app delivery for this type is off.");
      return;
    }
    setNotices((ns) => [
      {
        ...sample,
        id: Math.max(...ns.map((n) => n.id)) + 1,
        read: false,
        age: "Just now",
      },
      ...ns,
    ]);
    setMode("normal");
    setFeedback(
      "A new mock event arrived. Existing read states are unchanged."
    );
  }
  const badge = (
    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
      {unread > 99 ? "99+" : unread}
    </span>
  );
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Bell className="size-5" />
          Notifications {badge}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your activity across Cadence
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setScreen(screen === "inbox" ? "preferences" : "inbox")
          }
        >
          <Settings2 className="size-4" />
          {screen === "inbox" ? "Preferences" : "Inbox"}
        </Button>
        {variant === "A" && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close notifications"
            onClick={() => setPanel(false)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
      <div className="flex gap-1" aria-label="Notification filter">
        <Button
          size="sm"
          variant={filter === "all" ? "secondary" : "ghost"}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === "unread" ? "secondary" : "ghost"}
          onClick={() => setFilter("unread")}
          aria-pressed={filter === "unread"}
        >
          Unread
        </Button>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={!unread || mode !== "normal"}
        onClick={() => {
          const ids = new Set(mine.map((n) => n.id));
          setNotices((ns) =>
            ns.map((n) => (ids.has(n.id) ? { ...n, read: true } : n))
          );
        }}
      >
        <CheckCheck className="size-4" />
        Mark all as read
      </Button>
    </div>
  );
  const list = (
    <>
      {controls}
      {mode === "loading" ? (
        <div role="status" className="space-y-4 p-6">
          Loading notifications…
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : mode === "error" ? (
        <div role="alert" className="p-8 text-center">
          <h3 className="font-semibold">Notifications couldn’t be loaded</h3>
          <p className="my-3 text-sm text-muted-foreground">
            Your notifications haven’t been removed.
          </p>
          <Button variant="outline" onClick={() => setMode("normal")}>
            Try again
          </Button>
        </div>
      ) : !filtered.length ? (
        <div className="p-10 text-center">
          <Bell className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h3 className="font-semibold">
            {filter === "unread" && mine.length && mode !== "empty"
              ? "You’re all caught up"
              : "No notifications yet"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "unread"
              ? "Read notifications are still available under All."
              : "New activity will appear here."}
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {filtered.slice(0, limit).map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-2 px-4 py-4 ${!n.read ? "bg-primary/5" : ""} ${selectedId === n.id ? "ring-1 ring-inset ring-primary/40" : ""}`}
              >
                <span
                  className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
                  aria-label={n.read ? "Read" : "Unread"}
                />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => open(n)}
                >
                  <span
                    className={`block text-sm ${!n.read ? "font-semibold" : "font-medium"}`}
                  >
                    {n.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {n.context}
                  </span>
                  {variant !== "C" && (
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {n.age}
                    {persona === "Mixed roles" ? ` · ${n.audience}` : ""}
                  </span>
                </button>
                <button
                  className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => read(n.id, !n.read)}
                  aria-label={`${n.read ? "Mark unread" : "Mark read"}: ${n.title}`}
                >
                  {n.read ? "Unread" : "Read"}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="p-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((l) => l + 4)}
              >
                Load older notifications
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
  const detail = selected ? (
    <section className="p-6" aria-label="Selected notification">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {selected.age}
      </p>
      <h3 className="mt-3 text-xl font-semibold">{selected.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{selected.context}</p>
      <p className="my-6 leading-relaxed">{selected.body}</p>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Example destination</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {selected.destination}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          This preview stays here. Production would open the relevant page.
        </p>
      </div>
      <Button
        className="mt-5"
        size="sm"
        variant="outline"
        onClick={() => setSelectedId(null)}
      >
        <ChevronLeft className="size-4" />
        Back to notifications
      </Button>
    </section>
  ) : (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <Mail className="size-8" />
      <p>Select a notification to read it.</p>
    </div>
  );
  const settings = (
    <section className="p-5">
      <h3 className="text-lg font-semibold">Notification preferences</h3>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Applies across your account and all courses. Changes save immediately.
      </p>
      <div className="mb-5 rounded-lg bg-muted p-3 text-sm">
        Purchase confirmations and your Refund Request updates are always
        delivered. Turning off a channel leaves earlier inbox notifications in
        place.
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 border-b pb-2 text-center text-xs font-medium text-muted-foreground">
        <span className="text-left">Notification</span>
        <span>In-app</span>
        <span>Email</span>
      </div>
      {groups.map((group) => (
        <div key={group}>
          <h4 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </h4>
          {types
            .filter((t) => t.group === group)
            .map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 border-b py-3"
              >
                <div className="text-sm">
                  {t.name}
                  {t.required && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Required
                    </span>
                  )}
                </div>
                {(["inApp", "email"] as const).map((channel) => (
                  <label key={channel} className="flex justify-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      aria-label={`${t.name}: ${channel === "inApp" ? "in-app" : "email"}`}
                      checked={preferences[t.id][channel]}
                      disabled={t.required}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPreferences((ps) => ({
                          ...ps,
                          [t.id]: { ...ps[t.id], [channel]: checked },
                        }));
                        setFeedback("Preference saved in this prototype.");
                      }}
                    />
                  </label>
                ))}
              </div>
            ))}
        </div>
      ))}
    </section>
  );
  const content =
    screen === "preferences" ? (
      settings
    ) : (
      <>
        {list}
        {variant !== "C" && selected && (
          <div className="border-t bg-muted/20">{detail}</div>
        )}
      </>
    );
  return (
    <div className="pb-32">
      <div className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-6 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
        <strong>Throwaway prototype</strong>
        <label>
          Preview account{" "}
          <select
            className="ml-2 rounded border bg-background p-1 text-foreground"
            value={persona}
            onChange={(e) => setPersona(e.target.value as Persona)}
          >
            {(
              [
                "Student",
                "Instructor",
                "Platform Admin",
                "Team Admin",
                "Mixed roles",
              ] as Persona[]
            ).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          State{" "}
          <select
            className="ml-2 rounded border bg-background p-1 text-foreground"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            {["normal", "empty", "error", "loading"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={arrival}>
          Simulate new event
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNotices(initialNotices());
            setSelectedId(null);
            setMode("normal");
            setLimit(4);
            setFeedback("Mock inbox reset. Preferences are unchanged.");
          }}
        >
          Reset inbox
        </Button>
      </div>
      <p className="sr-only" role="status">
        {feedback}
      </p>
      {variant === "A" ? (
        <VariantA
          header={header}
          content={content}
          panel={panel}
          badge={badge}
          onToggle={() => {
            setPanel(!panel);
            setScreen("inbox");
          }}
        >
          {children}
        </VariantA>
      ) : variant === "B" ? (
        <VariantB header={header} content={content} />
      ) : (
        <VariantC
          header={header}
          list={list}
          detail={detail}
          settings={settings}
          screen={screen}
          onBack={() => setScreen("inbox")}
        />
      )}
      <details className="mx-6 mt-6 rounded border border-dashed p-3 text-xs text-muted-foreground">
        <summary>Prototype state · {names[variant]}</summary>
        <pre className="mt-2 max-h-60 overflow-auto">
          {JSON.stringify(
            {
              variant,
              persona,
              screen,
              mode,
              unread,
              filter,
              limit,
              selectedId,
              visibleIds: filtered.slice(0, limit).map((n) => n.id),
              readStates: mine.map(({ id, read }) => ({ id, read })),
              preferences,
              feedback,
            },
            null,
            2
          )}
        </pre>
      </details>
      {import.meta.env.DEV && (
        <PrototypeVariantSwitcher variant={variant} cycle={cycle} />
      )}
    </div>
  );
}

export function VariantA({
  children,
  header,
  content,
  panel,
  badge,
  onToggle,
}: {
  children: ReactNode;
  header: ReactNode;
  content: ReactNode;
  panel: boolean;
  badge: ReactNode;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="flex justify-end border-b px-6 py-3">
        <Button variant="outline" onClick={onToggle} aria-expanded={panel}>
          <Bell className="size-4" />
          Notifications {badge}
        </Button>
      </div>
      <div className="relative">
        {children}
        {panel && (
          <aside
            className="absolute right-4 top-3 z-10 max-h-[75vh] w-[min(26rem,calc(100%_-_2rem))] overflow-y-auto rounded-xl border bg-background shadow-xl"
            aria-label="Notifications panel"
          >
            {header}
            {content}
          </aside>
        )}
      </div>
    </>
  );
}
export function VariantB({
  header,
  content,
}: {
  header: ReactNode;
  content: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <p className="mb-4 text-sm text-muted-foreground">
        Dashboard / Notifications
      </p>
      <section className="overflow-hidden rounded-xl border bg-background">
        {header}
        {content}
      </section>
    </div>
  );
}
export function VariantC({
  header,
  list,
  detail,
  settings,
  screen,
  onBack,
}: {
  header: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  settings: ReactNode;
  screen: string;
  onBack: () => void;
}) {
  return (
    <div className="p-4 md:p-8">
      <section className="overflow-hidden rounded-xl border bg-background">
        {header}
        <div className="grid md:grid-cols-[minmax(14rem,0.9fr)_minmax(16rem,1.1fr)]">
          <div className="min-w-0 border-b md:border-b-0 md:border-r">
            {screen === "preferences" ? (
              <div className="p-5">
                <h3 className="font-semibold">Your account</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set how you hear about activity across Cadence.
                </p>
                <Button className="mt-4" variant="outline" onClick={onBack}>
                  Back to inbox
                </Button>
              </div>
            ) : (
              list
            )}
          </div>
          <div className="min-w-0">
            {screen === "preferences" ? settings : detail}
          </div>
        </div>
      </section>
    </div>
  );
}
function PrototypeVariantSwitcher({
  variant,
  cycle,
}: {
  variant: keyof typeof names;
  cycle: (offset: number) => void;
}) {
  return (
    <nav
      aria-label="Prototype variants"
      className="fixed bottom-6 left-1/2 z-50 flex max-w-[95vw] -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-3 py-2 text-sm text-white shadow-xl"
    >
      <button
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Previous variant"
        onClick={() => cycle(-1)}
      >
        <ArrowLeft className="size-4" />
      </button>
      <span className="whitespace-nowrap">
        {variant} · {names[variant]}
      </span>
      <button
        className="rounded-full p-2 hover:bg-white/15"
        aria-label="Next variant"
        onClick={() => cycle(1)}
      >
        <ArrowRight className="size-4" />
      </button>
    </nav>
  );
}
