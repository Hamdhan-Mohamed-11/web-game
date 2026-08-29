import QRCode from "qrcode";
import ScreenShell from "@/components/screen/ScreenShell";
import NetworkingDashboard from "./NetworkingDashboard";
import { LiveBadge, RoundClock } from "./HeaderClock";

// The QR is generated per request on the server rather than in the browser:
// it never changes during the event, so there's no reason to ship the
// encoder to the client or to paint a blank square on first frame.
export const dynamic = "force-dynamic";

const TITLE = (
  <>
    Meet a Reader. <span className="text-gold-400">Discover a Book.</span>
  </>
);

export default async function NetworkingScreenPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const joinUrl = new URL("/networking", siteUrl).toString();
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    width: 520,
    margin: 1,
    color: { dark: "#072966", light: "#FFFFFF" },
  });

  return (
    <ScreenShell
      gameName={TITLE}
      compact
      headerLeft={<LiveBadge />}
      headerRight={<RoundClock />}
    >
      <NetworkingDashboard qrDataUrl={qrDataUrl} joinUrl={joinUrl} />
    </ScreenShell>
  );
}
