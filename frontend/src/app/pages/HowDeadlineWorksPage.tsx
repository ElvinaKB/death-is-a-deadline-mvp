import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import marketplaceImg from "../../assets/how-works-marketplace.png";
import listingImg from "../../assets/how-works-listing.png";
import bidImg from "../../assets/how-works-bid.png";
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

function StepCard({
  n,
  title,
  description,
  image,
}: {
  n: number;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10">
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
            <p className="text-gray-300 leading-relaxed">{description}</p>
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
          <h2 className="text-4xl md:text-5xl font-black leading-[1.05] mb-6 max-w-3xl">
            Private pricing. Verified travelers. No public discounts.
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
            Deadline is a private marketplace where verified travelers submit
            confidential bids on unsold hotel rooms. It&apos;s not an auction —
            there&apos;s no bidding war and no visible competition. Each hotel
            sets one hidden minimum. Meet it, and the room is instantly yours.
          </p>
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
              description="A .edu, .gov, or approved corporate email verifies instantly. Anyone else can verify with LinkedIn or a quick ID check — Deadline isn't open to the general public."
              image={marketplaceImg}
            />
            <StepCard
              n={2}
              title="Place a private bid"
              description="Pick your dates and enter what you're willing to pay per night. You're bidding against the retail price shown on the page — the hotel's actual minimum is never displayed anywhere."
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
        </section>

        {/* Blind bidding, confidential minimums */}
        <section
          className="rounded-2xl p-8 md:p-10"
          style={{ backgroundColor: NAVY }}
        >
          <h2
            className="text-2xl md:text-3xl font-black uppercase mb-4 text-white"
          >
            Why the minimum stays{" "}
            <span style={{ color: GOLD }}>confidential</span>
          </h2>
          <p className="text-gray-300 leading-relaxed max-w-3xl mb-4">
            A hotel&apos;s private minimum is never published, never shown to
            travelers, and never the same number twice — it shifts slightly
            based on real signals like how much inventory is left and how
            close the date is. There&apos;s no fixed number to guess, screenshot,
            or pass along to a friend.
          </p>
          <p className="text-gray-300 leading-relaxed max-w-3xl">
            That confidentiality is the whole point: it lets a hotel move
            unsold inventory at a real discount without that price ever
            becoming a public rate, so it never triggers rate-parity clauses
            or undercuts what the hotel charges everywhere else.
          </p>
        </section>

        {/* For Hotels */}
        <section>
          <SectionHeading>For Hotels</SectionHeading>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl">
            An unsold room tonight earns nothing. Deadline turns it into
            revenue without touching your public rate.
          </p>
          <ul className="space-y-4 max-w-2xl mb-8">
            <Check>
              You set a private minimum — one flat number, or a different
              floor for each day of the week. It's never published anywhere.
            </Check>
            <Check>
              Your public rates on your own site and OTAs never move. A
              closed, verified-member channel sits outside published parity —
              it isn't a public discount, so it doesn't trigger rate-parity or
              most-favored-nation clauses.
            </Check>
            <Check>
              7% commission, only on bids you accept. No listing fee, no
              subscription, nothing charged for empty rooms.
            </Check>
            <Check>
              You control exactly what's bookable — blackout dates, which
              days of the week are open, and how many rooms per night.
            </Check>
            <Check>
              If you charge a mandatory resort or parking fee, it's disclosed
              and folded into the price shown up front — never hidden, never
              added after the fact.
            </Check>
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
          <ul className="space-y-4 max-w-2xl">
            <Check>
              Acceptance is instant and binding. There&apos;s no separate
              hotel-side approval step — the room is confirmed and your card
              is charged the moment your bid clears the hotel&apos;s price.
            </Check>
            <Check>
              Deadline is the merchant of record on your card statement, and a
              confirmation email goes out right away with your reservation
              details.
            </Check>
            <Check>
              The reservation is booked in your name. You need to be the
              guest checking in (or among the group staying) — the hotel may
              ask for ID matching the reservation at check-in.
            </Check>
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
