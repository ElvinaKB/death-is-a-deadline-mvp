import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import marketplaceImg from "../../assets/how-works-marketplace.png";
import listingImg from "../../assets/how-works-listing.png";
import tooLowImg from "../../assets/how-works-too-low.png";
import acceptedImg from "../../assets/how-works-accepted.png";

const GOLD = "#c5a059";
const NAVY = "#040d1f";

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className="w-6 h-6 mt-0.5 shrink-0"
        style={{ color: GOLD }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span className="text-lg leading-snug">{children}</span>
    </li>
  );
}

function IconRow({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail?: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="text-2xl leading-none shrink-0" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="font-bold text-lg leading-snug">{title}</p>
        {detail && (
          <p className="text-gray-600 text-sm leading-relaxed mt-0.5">
            {detail}
          </p>
        )}
      </div>
    </li>
  );
}

function StepCard({
  n,
  title,
  description,
  image,
  badges,
}: {
  n: number;
  title: string;
  description: string;
  image: string;
  badges?: string[];
}) {
  return (
    <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
      <img src={image} alt={title} className="w-full h-auto block" />
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full font-black shrink-0 text-sm"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            {n}
          </span>
          <div>
            <p className="font-black text-lg mb-1" style={{ color: GOLD }}>
              {title}
            </p>
            <p className="text-gray-600 leading-relaxed">{description}</p>
            {badges && (
              <div className="flex flex-wrap gap-2 mt-3">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    ✅ {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-6"
      style={{ color: NAVY }}
    >
      {children}
    </h2>
  );
}

/** Loops: hidden minimum -> a losing bid -> rejected -> a winning bid -> accepted -> repeat. */
function AnimatedPricingDemo() {
  const PHASES = [
    { bid: null, result: null, duration: 1400 },
    { bid: 160, result: null, duration: 1200 },
    { bid: 160, result: "rejected" as const, duration: 2000 },
    { bid: 220, result: null, duration: 1200 },
    { bid: 220, result: "accepted" as const, duration: 2400 },
  ];
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setPhase((p) => (p + 1) % PHASES.length),
      PHASES[phase].duration,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const { bid, result } = PHASES[phase];

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-8 w-full max-w-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
        Minimum
      </p>
      <p
        className="text-3xl font-black tracking-[0.3em] mb-6"
        style={{ color: GOLD }}
      >
        • • • •
      </p>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
        Your Secret Bid
      </p>
      <p
        className="text-4xl font-black mb-6 h-11 transition-opacity duration-500"
        style={{ opacity: bid ? 1 : 0 }}
      >
        ${bid ?? 0}
      </p>
      <div className="h-9 flex items-center transition-opacity duration-500" style={{ opacity: result ? 1 : 0 }}>
        {result === "accepted" && (
          <span className="text-xl font-black text-emerald-400">
            ✓ Accepted
          </span>
        )}
        {result === "rejected" && (
          <span className="text-lg font-bold text-red-400">
            ✕ Not accepted — try again
          </span>
        )}
      </div>
    </div>
  );
}

function PricingComparisonDiagram() {
  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center text-center gap-2">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          Traditional OTA
        </p>
        <span className="text-2xl" aria-hidden>
          🏨
        </span>
        <span className="text-gray-300 text-sm">Hotel</span>
        <span className="text-gray-500">↓</span>
        <span className="text-2xl font-black text-white">$170</span>
        <span className="text-gray-500">↓</span>
        <p className="text-sm text-gray-400">Everyone sees it</p>
      </div>
      <div
        className="rounded-xl border p-6 flex flex-col items-center text-center gap-2"
        style={{ borderColor: GOLD, backgroundColor: "rgba(197,160,89,0.08)" }}
      >
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: GOLD }}>
          Deadline
        </p>
        <span className="text-2xl" aria-hidden>
          🏨
        </span>
        <span className="text-gray-300 text-sm">Hotel</span>
        <span className="text-gray-500">↓</span>
        <span
          className="text-xl font-black tracking-widest"
          style={{ color: GOLD }}
        >
          Hidden
        </span>
        <span className="text-gray-500">↓</span>
        <span className="text-gray-300 text-sm">Traveler places a Secret Bid</span>
        <span className="text-gray-500">↓</span>
        <p className="text-sm font-medium" style={{ color: GOLD }}>
          Only the winner ever sees a price
        </p>
      </div>
    </div>
  );
}

export function HowDeadlineWorksPage() {
  return (
    <div className="bg-white text-[#1a1a1a]">
      {/* Hero */}
      <header
        className="relative bg-cover bg-center pt-12 pb-24 px-6 text-white"
        style={{ backgroundColor: NAVY }}
      >
        <div className="max-w-5xl mx-auto">
          <Link to={ROUTES.HOME} className="flex items-center mb-12">
            <h1
              className="text-4xl font-black tracking-tighter uppercase"
              style={{ color: GOLD }}
            >
              Deadline
            </h1>
          </Link>
          <p
            className="text-sm font-bold uppercase tracking-[0.2em] mb-4"
            style={{ color: GOLD }}
          >
            How Deadline Works
          </p>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black leading-[1.05] mb-6 max-w-xl">
                Hotels have a secret minimum price.
                <br />
                <span style={{ color: GOLD }}>Your job is to guess it.</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-xl leading-relaxed">
                Meet it, and the room is instantly yours — no bidding war, no
                visible competition, just you against the hotel&apos;s hidden
                number.
              </p>
            </div>
            <div className="flex justify-center">
              <AnimatedPricingDemo />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-24">
        {/* For Travelers */}
        <section>
          <SectionHeading>For Travelers</SectionHeading>
          <p className="text-lg text-gray-700 mb-10 max-w-3xl">
            Four steps, start to finish. If your bid doesn&apos;t meet the
            hotel&apos;s price, you&apos;re never charged — adjust and try
            again.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <StepCard
              n={1}
              title="Get verified"
              description="Deadline isn't open to the general public — verify once and you're in."
              image={marketplaceImg}
              badges={["LinkedIn", ".edu / .gov Email", "Quick ID Check"]}
            />
            <StepCard
              n={2}
              title="Place a Secret Bid"
              description="Pick your dates and enter what you're willing to pay per night. You're bidding against the retail price shown — the hotel's actual minimum is never displayed anywhere."
              image={listingImg}
            />
            <StepCard
              n={3}
              title="Instant answer"
              description="Below the hotel's threshold? You'll see it immediately, with no charge, and can adjust your bid and try again right away."
              image={tooLowImg}
            />
            <StepCard
              n={4}
              title="You're booked"
              description="Meet the threshold and your reservation is confirmed on the spot. Your card is charged for the full price shown, and a confirmation email goes out immediately."
              image={acceptedImg}
            />
          </div>
          <p
            className="mt-8 text-center text-base font-bold rounded-xl py-4 px-6"
            style={{ backgroundColor: "rgba(197,160,89,0.1)", color: NAVY }}
          >
            ⏳ Hotels release only a limited number of rooms each night — once
            they&apos;re gone, they&apos;re gone.
          </p>
        </section>

        {/* Blind bidding, confidential minimums */}
        <section
          className="rounded-2xl p-8 md:p-10"
          style={{ backgroundColor: NAVY }}
        >
          <h2 className="text-2xl md:text-3xl font-black uppercase mb-4 text-white">
            Why the minimum stays{" "}
            <span style={{ color: GOLD }}>confidential</span>
          </h2>
          <p className="text-gray-300 leading-relaxed max-w-3xl mb-4">
            A hotel&apos;s private minimum is never published, never shown to
            travelers, and never the same number twice — it shifts slightly
            based on real signals like how much inventory is left and how
            close the date is. There&apos;s no fixed number to guess,
            screenshot, or pass along to a friend.
          </p>
          <p className="text-gray-300 leading-relaxed max-w-3xl">
            That confidentiality is the whole point: it lets a hotel move
            unsold inventory at a real discount without that price ever
            becoming a public rate, so it never triggers rate-parity clauses
            or undercuts what the hotel charges everywhere else.
          </p>
          <PricingComparisonDiagram />
        </section>

        {/* For Hotels */}
        <section>
          <SectionHeading>For Hotels</SectionHeading>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl">
            An unsold room tonight earns nothing. Deadline turns it into
            revenue without touching your public rate.
          </p>
          <ul className="space-y-5 max-w-2xl mb-8">
            <IconRow
              icon="🔒"
              title="You set the minimum"
              detail="One flat number, or a different floor for each day of the week. It's never published anywhere."
            />
            <IconRow
              icon="📈"
              title="Your public rates never move"
              detail="A closed, verified-member channel sits outside published parity — it doesn't trigger rate-parity or most-favored-nation clauses."
            />
            <IconRow
              icon="💳"
              title="7% commission, only when a bid is accepted"
              detail="No listing fee, no subscription, nothing charged for empty rooms."
            />
            <IconRow
              icon="🎛️"
              title="Full control"
              detail="Blackout dates, which days of the week are open, and how many rooms per night — all yours to set."
            />
            <IconRow
              icon="🧾"
              title="Mandatory fees are disclosed and included"
              detail="A resort or parking fee, if you charge one, is folded into the price shown up front — never hidden, never added after the fact."
            />
          </ul>
          <Link
            to={ROUTES.HOTELS_JOIN}
            className="inline-block rounded-full px-8 py-3 text-base font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            → List Your Hotel
          </Link>
        </section>

        {/* After acceptance */}
        <section>
          <SectionHeading>After Your Bid Is Accepted</SectionHeading>
          <ul className="space-y-5 max-w-2xl">
            <IconRow
              icon="⚡"
              title="Instant and binding"
              detail="There's no separate hotel-side approval step — the room is confirmed and your card is charged the moment your bid clears the hotel's price."
            />
            <IconRow
              icon="📧"
              title="Confirmed right away"
              detail="Deadline is the merchant of record on your card statement, and a confirmation email goes out immediately with your reservation details."
            />
            <IconRow
              icon="🪪"
              title="Booked in your name"
              detail="You need to be the guest checking in (or among the group staying) — the hotel may ask for ID matching the reservation."
            />
          </ul>
        </section>

        {/* Fees, taxes, cancellations */}
        <section>
          <SectionHeading>Fees, Taxes &amp; Cancellations</SectionHeading>
          <ul className="space-y-4 max-w-2xl">
            <Check>
              The price you see before you confirm is the full price. Any
              mandatory hotel fee — a resort fee, or parking where it isn&apos;t
              optional — is already included, never added afterward.
            </Check>
            <Check>
              Government taxes are collected separately by the hotel at
              check-in, as required by law. Genuinely optional charges —
              self-park parking, pet fees, incidentals — are always separate
              and handled directly with the hotel.
            </Check>
            <Check>
              For hotels in California, state law entitles you to a full
              refund if you cancel within 24 hours of booking, as long as you
              booked at least 72 hours before check-in. For every other
              state, and for California bookings past that window, your bid
              is binding and non-refundable once accepted.
            </Check>
          </ul>
        </section>

        {/* Final CTA */}
        <section
          className="rounded-2xl px-8 py-12 text-center text-white"
          style={{ backgroundColor: NAVY }}
        >
          <h3 className="text-3xl md:text-4xl font-black uppercase mb-3">
            Ready to see it for yourself?
          </h3>
          <p className="text-gray-300 mb-8">
            Verified travelers bid on real hotel rooms. Hotels set the floor.
            Everyone keeps their price where it belongs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to={ROUTES.SIGNUP}
              className="inline-block rounded-full px-10 py-4 text-lg font-black uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: GOLD }}
            >
              → Sign Up to Bid
            </Link>
            <Link
              to={ROUTES.HOTELS_JOIN}
              className="inline-block rounded-full px-10 py-4 text-lg font-black uppercase tracking-wide border-2 transition-transform hover:-translate-y-0.5"
              style={{ borderColor: GOLD, color: GOLD }}
            >
              → List Your Hotel
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
