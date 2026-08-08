import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import headerBg from "../../assets/hotel-checkin.jpg";

const GOLD = "#c5a059";
const NAVY = "#040d1f";

const HOTELS_URL = "https://www.deadlinetravel.com/hotels";

const INTRO_MAILTO =
  "mailto:hotels@deadlinetravel.com?subject=Hotel%20introduction%20for%20Deadline&body=Hi%20Elvina%2C%0A%0AI'd%20like%20to%20introduce%20you%20to%20a%20hotel%3A%0A%0AHotel%20name%3A%0AContact%20name%20%26%20email%3A%0ACity%3A%0AWhy%20they'd%20be%20a%20fit%3A%0A%0A(You%20can%20share%20this%20with%20them%3A%20https%3A%2F%2Fwww.deadlinetravel.com%2Fhotels)%0A%0AThanks!";

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

export function ReferralsLandingPage() {
  return (
    <div className="bg-white text-[#1a1a1a]">
      {/* Hero */}
      <header
        className="relative bg-cover bg-center pt-12 pb-28 px-6 text-white"
        style={{
          backgroundColor: NAVY,
          backgroundImage: `linear-gradient(rgba(4, 13, 31, 0.82), rgba(4, 13, 31, 0.82)), url(${headerBg})`,
        }}
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

          <div className="max-w-2xl">
            <p
              className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
              style={{ color: GOLD }}
            >
              Earn With Deadline
            </p>
            <h2 className="text-5xl md:text-6xl font-black leading-none mb-5 uppercase">
              Know an
              <br />
              independent hotel?
            </h2>
            <div className="h-1 w-32 mb-6" style={{ backgroundColor: GOLD }} />
            <p className="text-2xl md:text-3xl font-bold">
              Introduce us — and get paid
              <br />
              <span style={{ color: GOLD }}>50% of our commission</span> for a
              full year.
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className="-mt-6 bg-white pb-20 relative z-10"
        style={{
          borderTopLeftRadius: "50% 20px",
          borderTopRightRadius: "50% 20px",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 pt-16">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            {/* The offer */}
            <div>
              <h3
                className="text-2xl font-black uppercase mb-4"
                style={{ color: NAVY }}
              >
                The offer
              </h3>
              <p className="text-lg leading-relaxed mb-6">
                If a hotel you introduce launches on Deadline, you earn{" "}
                <span className="font-bold" style={{ color: GOLD }}>
                  50% of Deadline's commission on their bookings for the first
                  year
                </span>
                . <span className="font-bold">No cap.</span>
              </p>
              <ul className="space-y-3 mb-8">
                <Check>
                  <span className="font-bold">No selling required.</span> Just
                  make the introduction.
                </Check>
                <Check>
                  <span className="font-bold">We demo the hotel.</span>
                </Check>
                <Check>
                  <span className="font-bold">We close the deal.</span>
                </Check>
                <Check>
                  <span className="font-bold">We support them.</span>
                </Check>
                <Check>
                  <span className="font-bold">You get paid</span> — automatically,
                  straight to your bank.
                </Check>
              </ul>

              <a
                href={INTRO_MAILTO}
                className="inline-block rounded-full px-8 py-4 text-lg font-black uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: GOLD }}
              >
                → Introduce a Hotel
              </a>
              <p className="text-sm text-gray-500 mt-3">
                Share this with your hotel friend so they can learn more &amp;
                book a discovery call:{" "}
                <a
                  href={HOTELS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline break-all"
                  style={{ color: GOLD }}
                >
                  {HOTELS_URL}
                </a>
              </p>
            </div>

            {/* Dashboard mockup — transparent reporting, paid to bank */}
            <div>
              <div
                className="rounded-2xl p-6 shadow-2xl border"
                style={{ backgroundColor: NAVY, borderColor: "#1e2a44" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <p className="text-white font-bold">Your Referral Dashboard</p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(197,160,89,0.15)", color: GOLD }}
                  >
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Earned", value: "$2,140" },
                    { label: "Bookings", value: "17" },
                    { label: "Hotels", value: "3" },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="rounded-lg px-2 py-3 text-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">
                        {t.label}
                      </p>
                      <p className="text-lg font-black text-white mt-1">
                        {t.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2"
                  style={{ backgroundColor: "rgba(197,160,89,0.1)" }}
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    style={{ color: GOLD }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <p className="text-xs text-white">
                    Paid via ACH to your bank —{" "}
                    <span className="font-bold" style={{ color: GOLD }}>
                      no manual entry
                    </span>
                  </p>
                </div>

                {[
                  { name: "The Ivy Boutique", city: "Charleston", amt: "$980" },
                  { name: "Cliffside Inn", city: "Big Sur", amt: "$760" },
                  { name: "Marlow House", city: "Savannah", amt: "$400" },
                ].map((h) => (
                  <div
                    key={h.name}
                    className="flex items-center justify-between py-2 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-sm text-white">
                      {h.name}{" "}
                      <span className="text-gray-400">· {h.city}</span>
                    </span>
                    <span className="text-sm font-bold" style={{ color: GOLD }}>
                      {h.amt}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">
                Transparent, real-time reporting. Illustrative figures.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-20">
            <h3
              className="text-2xl font-black uppercase mb-8 text-center"
              style={{ color: NAVY }}
            >
              How it works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: "1",
                  t: "Introduce a hotel",
                  d: "Email us a warm intro, or have them book a discovery call. That's your whole job.",
                },
                {
                  n: "2",
                  t: "We do the rest",
                  d: "We demo, close, onboard, and support the hotel end-to-end.",
                },
                {
                  n: "3",
                  t: "You get paid for a year",
                  d: "50% of our commission on their bookings, auto-deposited to your bank for 12 months.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border p-6"
                  style={{ borderColor: "#e6e6e6" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-black mb-4"
                    style={{ backgroundColor: GOLD }}
                  >
                    {s.n}
                  </div>
                  <p className="font-black text-lg mb-2" style={{ color: NAVY }}>
                    {s.t}
                  </p>
                  <p className="text-gray-600 leading-snug">{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div
            className="mt-16 rounded-2xl px-8 py-12 text-center"
            style={{ backgroundColor: NAVY }}
          >
            <h3 className="text-3xl md:text-4xl font-black uppercase text-white mb-3">
              Make the introduction.
              <br />
              <span style={{ color: GOLD }}>We'll take it from there.</span>
            </h3>
            <p className="text-gray-300 mb-6">
              No cap. No selling. Just warm intros that pay you for a year.
            </p>
            <Link
              to={ROUTES.REFERRAL_SIGNUP}
              className="inline-block rounded-full px-10 py-4 text-lg font-black uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: GOLD }}
            >
              → Sign Up as a Referral Partner
            </Link>
            <p className="text-sm text-gray-400 mt-4">
              Questions? Email{" "}
              <a
                href="mailto:hotels@deadlinetravel.com"
                className="font-bold hover:underline"
                style={{ color: GOLD }}
              >
                hotels@deadlinetravel.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
