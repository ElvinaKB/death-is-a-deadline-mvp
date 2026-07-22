import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes.config";
import headerBg from "../../assets/hotel-checkin.jpg";
import elvinaPhoto from "../../assets/Elvina.png";

export function HotelsLandingPage() {
  return (
    <div className="bg-white text-[#1a1a1a]">
      {/* Header */}
      <header
        className="relative bg-[#040d1f] bg-cover bg-center pt-12 pb-24 px-6 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(4, 13, 31, 0.7), rgba(4, 13, 31, 0.7)), url(${headerBg})`,
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center mb-12">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-[#c5a059]">
              Deadline
            </h1>
          </Link>

          {/* Hero Content */}
          <div className="max-w-2xl">
            <h2 className="text-5xl md:text-6xl font-black leading-none mb-4 uppercase">
              Fill Empty
              <br />
              Rooms Privately
            </h2>
            <div className="h-1 w-32 bg-[#c5a059] mb-6" />
            <p className="text-xl md:text-2xl font-bold mb-2">
              List your 10-30% vacancies
              <br />
              on nearing off-nights
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="-mt-5 bg-white pb-20 relative z-10"
        style={{
          borderTopLeftRadius: "50% 20px",
          borderTopRightRadius: "50% 20px",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 pt-16">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Left Column: Problem & Solution */}
            <div>
              <section className="mb-16">
                <h3 className="text-2xl font-black text-[#040d1f] uppercase mb-2">
                  The Problem
                </h3>
                <p className="text-lg leading-snug">
                  OTAs take{" "}
                  <span className="text-[#c5a059] font-bold">
                    up to 25% in commissions
                  </span>{" "}
                  while discounting your hotel publicly—and they do it with
                  every other hotel on the block.
                </p>
                <div className="h-1 w-[100px] bg-[#c5a059] my-5" />
              </section>

              <section>
                <h3 className="text-2xl font-black text-[#040d1f] uppercase mb-2">
                  Solution
                </h3>
                <p className="text-lg leading-snug">
                  <span className="text-[#c5a059] font-bold">Deadline</span>{" "}
                  is a private bidding platform for verified travelers. They
                  bid above your threshold to win, but your minimum price
                  stays hidden.
                </p>
              </section>
            </div>

            {/* Right Column: How It Works */}
            <div>
              <h3 className="text-2xl font-black text-[#040d1f] uppercase mb-8">
                How It Works
              </h3>

              <div className="space-y-12 relative">
                {/* Step 1 */}
                <div className="flex items-start relative">
                  <div className="absolute left-5 top-10 bottom-0 border-l-2 border-dashed border-[#c5a059] z-0" />
                  <div className="relative z-10 bg-[#040d1f] border-2 border-[#c5a059] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-6 shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase">
                      Set your minimum rate.
                    </h4>
                    <p className="text-gray-700">
                      Choose the lowest rate you're willing to accept and on
                      which days of the week.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start relative">
                  <div className="absolute left-5 top-10 bottom-0 border-l-2 border-dashed border-[#c5a059] z-0" />
                  <div className="relative z-10 bg-[#040d1f] border-2 border-[#c5a059] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-6 shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase">
                      Verified travelers bid.
                    </h4>
                    <p className="text-gray-700">
                      Our private marketplace requires travelers to provide
                      proof of employment or education.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start relative">
                  <div className="relative z-10 bg-[#040d1f] border-2 border-[#c5a059] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-6 shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase">
                      Auto-confirm bookings.
                    </h4>
                    <p className="text-gray-700">
                      When a bid meets your threshold, the reservation is
                      automatically confirmed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Why Join Section */}
      <section className="bg-[#040d1f] text-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Why Join List */}
            <div>
              <h3 className="text-2xl font-black text-[#c5a059] uppercase mb-8">
                Why Join?
              </h3>

              <div className="flex items-center mb-8">
                <div className="border-2 border-[#c5a059] rounded-lg p-3 mr-6">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#c5a059"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-black uppercase tracking-tight">
                    7% Commission
                  </p>
                  <p className="text-gray-400">No long term contract</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="text-[#c5a059] font-bold mr-4 text-xl">
                    1
                  </div>
                  <p className="text-lg">Remain on OTAs</p>
                </div>
                <div className="flex items-start">
                  <div className="text-[#c5a059] font-bold mr-4 text-xl">
                    2
                  </div>
                  <p className="text-lg">
                    List the hotel's vacancy rate (10-30%) on Deadline
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="text-[#c5a059] font-bold mr-4 text-xl">
                    3
                  </div>
                  <p className="text-lg">Blind bids can exceed your minimum</p>
                </div>
              </div>
            </div>

            {/* Operator Section */}
            <div className="border-l border-[#c5a059] md:pl-12">
              <h3 className="text-lg font-black text-[#c5a059] uppercase mb-6 tracking-widest text-center">
                Built by a Hotel Operator
              </h3>

              <div className="flex flex-col items-center text-center">
                <a
                  href="https://www.linkedin.com/in/elvinabeck/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-48 rounded-2xl border-4 border-[#c5a059] overflow-hidden mb-4 shadow-lg block"
                >
                  <img
                    src={elvinaPhoto}
                    alt="Elvina Beck — Hospitality Expert"
                    className="w-full h-full object-cover"
                  />
                </a>
                <p className="text-gray-300 italic text-balance max-w-[260px]">
                  Elvina Beck has operated PodShare properties since 2012.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#040d1f] text-white py-12 px-6 border-t border-[#c5a059]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <h3 className="text-3xl font-black uppercase mb-4">
                Ready to Get Started?
              </h3>
              <Link
                to={ROUTES.HOTELS_JOIN}
                className="inline-block bg-[#c5a059] text-[#040d1f] font-bold uppercase tracking-wide px-6 py-3 rounded-lg hover:bg-[#d4b26a] transition-colors"
              >
                List Your Hotel →
              </Link>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-[#c5a059] mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <Link
                  to={ROUTES.HOME}
                  className="text-lg font-bold text-[#c5a059] hover:underline"
                >
                  Visit DeadlineTravel.com
                </Link>
              </div>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-[#c5a059] mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href="mailto:deadline@podshare.com"
                  className="text-lg font-bold text-[#c5a059] hover:underline"
                >
                  Email deadline@podshare.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
