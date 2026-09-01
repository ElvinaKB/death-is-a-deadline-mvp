import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import headerBg from "../../assets/hotel-checkin.jpg";

const GOLD = "#c5a059";
const NAVY = "#040d1f";

const SUPPORT_MAILTO =
  "mailto:hotels@deadlinetravel.com?subject=Cloudbeds%20channel%20connection%20help";

function StepNum({ n }: { n: string }) {
  return (
    <div
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-black text-black"
      style={{ backgroundColor: GOLD }}
    >
      {n}
    </div>
  );
}

export function HotelsCloudbedsPage() {
  return (
    <div className="bg-white text-[#1a1a1a]">
      {/* Hero */}
      <header
        className="relative bg-cover bg-center pt-12 pb-24 px-6 text-white"
        style={{
          backgroundColor: NAVY,
          backgroundImage: `linear-gradient(rgba(4, 13, 31, 0.85), rgba(4, 13, 31, 0.85)), url(${headerBg})`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Link to={ROUTES.HOME} className="flex items-center mb-10">
            <h1
              className="text-4xl font-black tracking-tighter uppercase"
              style={{ color: GOLD }}
            >
              Deadline
            </h1>
          </Link>

          <p
            className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
            style={{ color: GOLD }}
          >
            Cloudbeds &amp; myallocator
          </p>
          <h2 className="text-4xl md:text-5xl font-black leading-tight mb-5 uppercase">
            Connect Deadline
            <br />
            in Cloudbeds
          </h2>
          <div className="h-1 w-28 mb-6" style={{ backgroundColor: GOLD }} />
          <p className="text-xl md:text-2xl font-medium max-w-2xl text-gray-200">
            Deadline is an official Cloudbeds channel. Connect in a few minutes —
            entirely from your Cloudbeds dashboard — and start filling your
            unsold rooms privately.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        {/* Before you start */}
        <section>
          <h3
            className="text-2xl font-black uppercase mb-5"
            style={{ color: NAVY }}
          >
            Before you start
          </h3>
          <p className="text-lg leading-relaxed mb-4">
            You'll need two things from Deadline to connect, which we provide
            when your listing is set up:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="font-bold" style={{ color: GOLD }}>
                •
              </span>
              <span className="text-lg">
                <span className="font-bold">Your Deadline Property ID</span> —
                the unique identifier for your listing.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold" style={{ color: GOLD }}>
                •
              </span>
              <span className="text-lg">
                <span className="font-bold">Your connection password</span> — a
                private key that securely links your Cloudbeds property to your
                Deadline listing.
              </span>
            </li>
          </ul>
          <p className="text-base text-gray-600 mt-4">
            Don't have these yet? Email{" "}
            <a
              href={SUPPORT_MAILTO}
              className="font-bold hover:underline"
              style={{ color: GOLD }}
            >
              hotels@deadlinetravel.com
            </a>{" "}
            and we'll send them over.
          </p>
        </section>

        {/* Which describes you */}
        <section>
          <h3
            className="text-2xl font-black uppercase mb-6"
            style={{ color: NAVY }}
          >
            Which describes you?
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: "#e6e6e6" }}
            >
              <p className="font-black text-lg mb-2" style={{ color: NAVY }}>
                I already list on Deadline
              </p>
              <p className="text-gray-600 leading-snug">
                Your property is live at deadlinetravel.com. Skip ahead to{" "}
                <span className="font-bold">Connect in Cloudbeds</span> below —
                we'll send your Property ID and connection password.
              </p>
            </div>
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: "#e6e6e6" }}
            >
              <p className="font-black text-lg mb-2" style={{ color: NAVY }}>
                I'm new to Deadline
              </p>
              <p className="text-gray-600 leading-snug">
                Sign up first at{" "}
                <Link
                  to={ROUTES.HOTELS_JOIN}
                  className="font-bold hover:underline"
                  style={{ color: GOLD }}
                >
                  deadlinetravel.com/hotels/join
                </Link>
                . Once your listing is approved, follow the same steps below.
              </p>
            </div>
          </div>
        </section>

        {/* Connect in Cloudbeds */}
        <section>
          <h3
            className="text-2xl font-black uppercase mb-6"
            style={{ color: NAVY }}
          >
            Connect in Cloudbeds
          </h3>
          <p className="text-lg leading-relaxed mb-8">
            The whole connection is <span className="font-bold">self-service</span>{" "}
            inside Cloudbeds — no waiting on us.
          </p>
          <ol className="space-y-6">
            {[
              {
                t: "Open your channels",
                d: "In Cloudbeds, go to the Marketplace / Channels screen and choose Deadline.",
              },
              {
                t: "Enter your credentials",
                d: "Paste in the Deadline Property ID and connection password we provided. This securely links your Cloudbeds property to your Deadline listing.",
              },
              {
                t: "Map your rooms",
                d: "Match your Cloudbeds room type(s) to your Deadline listing so availability and rates sync correctly.",
              },
              {
                t: "Set what's biddable",
                d: "Choose how many rooms to release, your confidential minimum, the dates, and any blackout days (weekends included). Deadline only ever touches the inventory you allow.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex items-start gap-4">
                <StepNum n={String(i + 1)} />
                <div>
                  <p className="font-black text-lg" style={{ color: NAVY }}>
                    {s.t}
                  </p>
                  <p className="text-gray-600 leading-snug">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div
            className="mt-8 rounded-xl px-5 py-4"
            style={{ backgroundColor: "rgba(197,160,89,0.12)" }}
          >
            <p className="text-base">
              <span className="font-bold" style={{ color: NAVY }}>
                Full-price bookings always win.
              </span>{" "}
              Deadline syncs with your channel manager in real time, so if a room
              sells at full price through direct or another OTA, it's
              automatically pulled from Deadline. You never risk an oversell — and
              your public rates are never discounted.
            </p>
          </div>
        </section>

        {/* What is myallocator */}
        <section>
          <h3
            className="text-2xl font-black uppercase mb-4"
            style={{ color: NAVY }}
          >
            About myallocator
          </h3>
          <p className="text-lg leading-relaxed text-gray-700">
            Myallocator, by Cloudbeds, is a channel manager that distributes and
            instantly synchronizes your property's inventory to online travel
            marketplaces around the world. Push updates to travel websites and
            receive bookings from the customers you want to target, all while
            myallocator keeps everything updated in real time. Learn more at{" "}
            <a
              href="https://www.myallocator.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline"
              style={{ color: GOLD }}
            >
              myallocator.com
            </a>
            .
          </p>
          <p className="text-base text-gray-500 mt-4">
            Deadline is a single, direct channel — we don't re-syndicate your
            inventory to other OTAs.
          </p>
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl px-8 py-12 text-center"
          style={{ backgroundColor: NAVY }}
        >
          <h3 className="text-2xl md:text-3xl font-black uppercase text-white mb-3">
            Need a hand connecting?
          </h3>
          <p className="text-gray-300 mb-6">
            We'll send your Property ID and connection password and walk you
            through it.
          </p>
          <a
            href={SUPPORT_MAILTO}
            className="inline-block rounded-full px-10 py-4 text-lg font-black uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: GOLD }}
          >
            → Email hotels@deadlinetravel.com
          </a>
        </section>
      </main>
    </div>
  );
}
