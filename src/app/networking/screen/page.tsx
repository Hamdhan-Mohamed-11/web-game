import QRCode from "qrcode";
import ScreenShell from "@/components/screen/ScreenShell";
import NetworkingDashboard from "./NetworkingDashboard";

// The QR is generated per request on the server rather than in the browser:
// it never changes during the event, so there's no reason to ship the
// encoder to the client or to paint a blank square on first frame.
export const dynamic = "force-dynamic";

const TITLE = (
  <>
    Meet a Reader. <span className="text-gold-400">Discover a Book.</span>
  </>
);

/**
 * Pulsing "live" mark. Its whole job is to tell a room glancing up that the
 * numbers below are moving right now rather than being a printed summary of
 * something that already finished.
 */
function LiveBadge() {
  return (
    <div className="flex items-center gap-[0.9vh] rounded-full border border-white/20 bg-black/35 px-[1.4vh] py-[0.7vh] backdrop-blur-sm">
      <span className="relative flex h-[1.3vh] w-[1.3vh]" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
        <span className="relative inline-flex h-full w-full rounded-full bg-red-500" />
      </span>
      <span className="text-[1.7vh] font-semibold uppercase tracking-[0.18em] text-white">
        Live now
      </span>
    </div>
  );
}

function EventStamp({ date, time }: { date: string; time?: string }) {
  return (
    <div className="rounded-[1vh] border border-gold-500/30 bg-black/30 px-[1.5vh] py-[0.8vh] text-right backdrop-blur-sm">
      <div className="font-display text-[2.1vh] font-bold uppercase tracking-[0.1em] text-white">
        {date}
      </div>
      {time && (
        <div className="text-[1.5vh] uppercase tracking-[0.12em] text-gold-400">{time}</div>
      )}
    </div>
  );
}

export default async function NetworkingScreenPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = new URL("/networking", siteUrl).toString();
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    width: 520,
    margin: 1,
    color: { dark: "#072966", light: "#FFFFFF" },
  });

  // Left unset the corner simply stays empty, which looks intentional —
  // better than inventing a date and projecting it ten feet wide.
  const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE;
  const eventTime = process.env.NEXT_PUBLIC_EVENT_TIME;

  return (
    <ScreenShell
      gameName={TITLE}
      compact
      headerLeft={<LiveBadge />}
      headerRight={eventDate ? <EventStamp date={eventDate} time={eventTime} /> : undefined}
    >
      <NetworkingDashboard qrDataUrl={qrDataUrl} joinUrl={joinUrl} />
    </ScreenShell>
  );
}
