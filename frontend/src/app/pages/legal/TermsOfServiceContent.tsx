/* eslint-disable max-lines */
/** Full legal text — hardcoded from client PDF. Do not parse at runtime. */
import {
  LegalH2,
  LegalH3,
  LegalNotice,
  LegalP,
  LegalUl,
  LegalMeta,
  LegalToc,
  LegalCopyright,
} from "./LegalTypography";

export function TermsOfServiceContent() {
  return (
    <>
      <LegalMeta
        operator="Operated by Student Deadline Inc"
        effectiveDate="June 6, 2026"
        lastUpdated="May 18, 2026"
      />
      <LegalP key="intro-0">
        These Terms of Service (the &ldquo;Terms&rdquo;) are a binding legal agreement between you and
        Student Deadline Inc., a Delaware corporation doing business as Death Is A Deadline (&ldquo;Death Is A
        Deadline,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), that govern your access to
        and use of our website at deadlinetravel.com and deathisadeadline.com, any successor domain, any mobile
        applications we publish, and the related application programming interfaces, features, tools, and services
        we own, operate, or provide (collectively, the &ldquo;Application&rdquo;). The Application and these
        services are collectively referred to as the &ldquo;Service.&rdquo; Other supplemental policies and terms
        linked to in these Terms or through the Service apply to your use of the Service, are incorporated by
        reference, and form part of your agreement with us. These include any Promotional Offer Terms (which govern
        any promotional offers, coupons, credits, ambassador programs, or campus campaigns we may run from time to
        time). Please also review our Privacy Policy for a description of our collection and use of personal data.
      </LegalP>
      <LegalNotice key="intro-n-1">
        SECTION 12 OF THESE TERMS INCLUDES A BINDING INDIVIDUAL ARBITRATION AGREEMENT, A JURY TRIAL WAIVER, AND A
        CLASS ACTION WAIVER THAT APPLY TO ALL CLAIMS BROUGHT AGAINST STUDENT DEADLINE INC. IN THE UNITED STATES.
        PLEASE READ IT CAREFULLY; IT AFFECTS YOUR LEGAL RIGHTS.
      </LegalNotice>

      <LegalToc
        items={[
          "Scope of Services",
          "Account Registration; Eligibility; .edu Verification",
          "Prohibited Activities; Termination",
          "Search Ranking and the Blind Bidding Process",
          "Content and Reviews",
          "Bidding and Booking through the Service; Rates, Taxes, and Fees",
          "Hotel Overbooking, Availability, and Cancellations",
          "Room Assignments, Check-In, and Your Relationship with the Hotel",
          "Disclaimer of Warranties",
          "Limitations on Liability",
          "Indemnification",
          "Arbitration Agreement",
          "Governing Law and Venue",
          "International Users",
          "General Terms",
        ]}
      />

      <LegalH2 key="b-0">1. Scope of Services</LegalH2>
      <LegalP key="b-1">
        The Service is a verified-identity, blind-bidding marketplace that enables eligible users to submit
        confidential, name-your-own-price bids for lodging and related services at hotels, resorts, hostels, bed
        &amp; breakfasts, and similar accommodations (&ldquo;Accommodations&rdquo;) offered by suppliers, vendors,
        or other providers of such Accommodations (&ldquo;Hotels&rdquo;). As the provider of the Service, Death Is A
        Deadline does not own, control, offer, manage, staff, or insure any Accommodations. When a bid you submit
        through the Service is accepted, a contract is formed directly between you and the Hotel for the reservation
        of the hotel room(s) and you agree to abide by all terms and conditions of the Hotel. Death Is A Deadline is
        not a party to the contracts concluded directly between users and Hotels. If a Hotel&apos;s terms and
        conditions conflict with these Terms, these Terms apply with respect to your relationship with Death Is A
        Deadline.
      </LegalP>
      <LegalP key="b-2">
        Death Is A Deadline is a technology marketplace, not a hotel, travel agent, lodging provider, or tour
        operator. Where required by applicable law, we may collect and remit certain transaction-based amounts on
        behalf of Hotels, but this does not make us the supplier of any Accommodation.
      </LegalP>
      <LegalP key="b-2b">
        <strong>Disclosed Intermediary; Merchant of Record.</strong> Death Is A Deadline acts as an independent
        technology intermediary. We are not an agent of any Hotel, do not bind any Hotel beyond transmitting your
        accepted Bid, and have no authority to vary, waive, or commit any Hotel to terms other than those the Hotel
        has loaded into the Service. Death Is A Deadline, acting through our payment processor Stripe, Inc.
        (&ldquo;Stripe&rdquo;), is the merchant of record on your card statement for the prepaid Reservation amount.
        We collect that amount as a facilitation payment for the underlying booking and remit the Hotel&apos;s share
        to the Hotel under our separate commercial arrangement with the Hotel. The Hotel — not Death Is A Deadline
        — remains the supplier of the lodging service and is solely responsible for performing the Reservation.
      </LegalP>
      <LegalH3 key="b-2c">1.1 Short-Term Lodging Only</LegalH3>
      <LegalP key="b-2d">
        The Service is for short-term lodging only. The maximum permitted length of any Reservation booked through
        the Service is twenty-nine (29) consecutive nights. We do not offer, and you may not use the Service to
        obtain, lodging that would constitute a residential tenancy under California Civil Code Section 1940 or any
        analogous law of any other jurisdiction. If you require a stay of thirty (30) or more consecutive nights,
        you must book directly with the Hotel and outside the Service.
      </LegalP>

      <LegalH2 key="b-3">2. Account Registration; Eligibility; .edu Verification</LegalH2>
      <LegalP key="b-4">
        You must register an account with Death Is A Deadline in order to access and use the Service. You must
        provide accurate, current, and complete information during registration and keep your account information
        up-to-date. You may not register more than one account, transfer your account to someone else, or use
        anyone else&apos;s account, alter egos, or disguised identities when using the Service. You are responsible
        for maintaining the confidentiality and security of your account credentials and may not disclose your
        credentials to any third party. You are responsible and liable for activities conducted through your
        account and must immediately notify us at the contact address in Section 15(n) if you suspect that your
        credentials have been lost or stolen or your account is otherwise compromised. Death Is A Deadline is not
        responsible or liable for any loss or damage arising from your failure to safeguard your account.
      </LegalP>
      <LegalH3 key="b-5">2.1 Eligibility — Verified Members of the Academic Community</LegalH3>
      <LegalP key="b-6">
        Death Is A Deadline is a verified-identity marketplace for the academic community, open to current college
        and university students, faculty, and staff. To register or to submit a bid, you must complete identity
        verification through one of the following methods at our discretion:
      </LegalP>
      <LegalUl
        key="b-7"
        items={[
          "(a) Email verification. Confirm a valid, currently active .edu (or equivalent recognized academic) email address through a one-time verification email we send you; or",
          "(b) Manual ID review. Upload a current student, faculty, or staff identification document (front and, where applicable, back), which our team will review and accept or reject in our sole discretion.",
        ]}
      />
      <LegalP key="b-7b">
        We may, in our sole discretion, accept, reject, request additional information, or re-verify any account at
        any time. Verification is a condition of access; we may suspend or terminate accounts whose verification we
        cannot confirm or that we believe are fraudulent, expired, shared, or otherwise non-compliant.
      </LegalP>
      <LegalH3 key="b-8">2.2 Limits of Verification</LegalH3>
      <LegalP key="b-9">
        WE DO NOT AND CANNOT GUARANTEE THAT EVERY USER ON THE PLATFORM IS A CURRENT, ELIGIBLE MEMBER OF THE ACADEMIC
        COMMUNITY. Verification is performed using the information you provide, automated email-domain checks, manual
        review of identification documents, and other reasonable commercial anti-fraud measures. Credentials can be
        lost, shared, expired, or fraudulently obtained. We make no representation or warranty that the user base
        consists exclusively of eligible academic users, and Hotels and Users acknowledge and accept this limitation
        as a condition of participating in the Service.
      </LegalP>
      <LegalH3 key="b-10">2.3 Representations and Warranties</LegalH3>
      <LegalP key="b-11">By using the Service, you represent and warrant that:</LegalP>
      <LegalUl
        key="b-12"
        items={[
          "You are at least 18 years of age and the age of majority in your jurisdiction of residence;",
          "You are not barred from using the Service under the laws of the United States, your place of residence, or any other applicable jurisdiction;",
          "You possess the legal authority to create a binding legal obligation;",
          "You are a current student, faculty member, or staff member at an accredited educational institution that issues you the credentials you used to verify, and your credentials remain active for so long as you use the Service, and you will notify us promptly if you cease to be a current student, faculty member, or staff member at the institution that issued your verification credentials;",
          "You will comply with all applicable laws, rules, and regulations relating to your use of the Service;",
          "You will use the Service in accordance with these Terms and comply with any relevant third-party terms relating to Accommodations booked through the Service;",
          "Any information you supply (including verification documents and payment information) is accurate, current, and complete;",
          "You will safeguard your account information and be responsible for any use of your account by you and anyone other than you;",
          "You will only use the Service to make legitimate bids and reservations for you, another member of your traveling party, or another person for whom you are legally authorized to act; and",
          "If you make a reservation for another member of your traveling party or another person for whom you are legally authorized to act: (i) you have full authority to accept these Terms on behalf of all persons whose names appear on the reservation; (ii) you will inform such other person(s) that these Terms apply to the reservations you have made on their behalf; and (iii) you (A) are legally authorized to grant consent on their behalf to share their personal data with Death Is A Deadline and any Hotels or other third parties as required to facilitate the reservation, or (B) you have received their knowing, informed consent to such data sharing.",
        ]}
      />
      <LegalH3 key="b-12b">2.4 Acknowledgment of Verification Limits</LegalH3>
      <LegalP key="b-12c">
        You acknowledge that the academic-credential verification described in this Section 2 is a fraud-deterrence
        measure, not a guarantee. We expressly do not represent that any other user, Hotel, or third party is, in
        fact, a member of the academic community, is who they claim to be, or is suitable for your purposes. You
        agree to take ordinary precautions consistent with any travel involving strangers.
      </LegalP>

      <LegalH2 key="b-13">3. Prohibited Activities; Termination</LegalH2>
      <LegalP key="b-14">
        The content and information on the Service, as well as the infrastructure used to provide them, are
        proprietary to Death Is A Deadline or our Hotels or partners. You agree not to modify, copy, distribute,
        transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell or
        re-sell the Application or any information, software, products, or services obtained from or through the
        Service. Additionally, you agree not to:
      </LegalP>
      <LegalUl
        key="b-15"
        items={[
          "Use bots, crawlers, scrapers, or other automated means or any manual process to access, monitor, copy, or collect data or other content from or otherwise interact with the Service without our express written permission, including for the purpose of discovering or reverse-engineering Hotel Floor Base values or our pricing or matching algorithms;",
          "Hack, avoid, remove, impair, or otherwise attempt to circumvent any security, verification, anti-fraud, or technological measure used to protect the Service or its content;",
          "Decipher, decompile, disassemble, or reverse engineer the Application or any of the software or hardware used to provide the Service;",
          "Take any action that could impose an unreasonable or disproportionately large load on our infrastructure or otherwise damage or adversely affect the performance or proper functioning of the Service;",
          "Violate the restrictions in any robot exclusion headers on the Service or bypass or circumvent other measures employed to prevent or limit access to the Service;",
          "Deep-link to any portion of the Application for any purpose without our express written consent;",
          "Use, copy, display, mirror, or frame any part of the Service, its content, or any page layout or design without our express written consent;",
          "Use the Service or its contents for any commercial purpose, including reselling, brokering, or arbitraging Reservations;",
          "Use the name, logo, branding, or trademarks of Death Is A Deadline or others without permission;",
          "Remove, alter, or obscure any copyright, trademark, or other proprietary rights notice on the Service;",
          "Submit any speculative, false, or fraudulent bid or reservation, including bids you do not intend to honor. A bid is \"speculative\" for purposes of this Section 3 if (i) it is submitted with no present intent to honor the resulting Reservation; (ii) it is one of a pattern of bids submitted across multiple accounts, payment methods, or devices intended to manipulate Floor Base outcomes; or (iii) it is part of a course of conduct in which more than twenty-five percent (25%) of the User's accepted Reservations have been disputed, charged back, or reported as no-shows by Hotels within any rolling twelve (12)-month period;",
          "Use a payment method (i) that you are not the named cardholder for and authorized to use, (ii) that has been reported lost or stolen, (iii) that has been associated with prior chargebacks on the Service, or (iv) that has been flagged by our payment processor's risk-scoring tools as elevated-risk, unless we expressly approve the transaction;",
          "Operate or register more than one account, including by using different .edu addresses, different identification documents, different devices, different IP addresses, different payment methods, or different shipping or billing addresses to evade limits on bids, Reservations, or promotional credits;",
          "Use the Service in a manner inconsistent with a stated travel purpose, including by reselling, brokering, gifting (other than to a member of your traveling party), or arbitraging Reservations against direct-to-consumer Hotel rates;",
          "Coordinate Bids with other Users to manipulate Floor Base values or to acquire blocks of inventory for resale or coordinated purposes;",
          "Use the Service to book lodging for a continuous stay of thirty (30) or more nights, whether through a single Bid or through consecutive or stacked Reservations at the same Hotel intended to circumvent the booking-length cap in Section 1.1;",
          "Use false, stolen, expired, shared, or unauthorized verification credentials, identity documents, or payment methods;",
          "Attempt to impersonate another person, account, or entity, including a representative of Death Is A Deadline or a Hotel;",
          "Use the Service in a manner that violates any travel or similar policy related to your employment or your educational institution;",
          "Engage in conduct that is discriminatory, threatening, harassing, or otherwise offensive;",
          "Offer or solicit prostitution or participate in or facilitate human trafficking; or",
          "Use the Service to store or transmit infringing, libelous, or otherwise unlawful or tortious material, or to store or transmit material in violation of third-party privacy rights.",
        ]}
      />
      <LegalH3 key="b-16">User Violations.</LegalH3>
      <LegalP key="b-17">
        If (i) you breach these Terms or any other supplemental policies and terms linked in these Terms or through
        the Service, (ii) you violate applicable laws, regulations, or third-party rights, (iii) we believe your bid,
        reservation, or account shows signs of fraud, abuse, identity misrepresentation, or suspicious activity, or
        (iv) we believe it is reasonably necessary to protect Death Is A Deadline, our payment processor, our Hotels,
        our other users, or third parties, we may, with or without prior notice and at our sole discretion:
      </LegalP>
      <LegalUl
        key="b-18"
        items={[
          "Terminate, suspend, or limit your access to or use of the Service and/or your account;",
          "Suspend or remove Reviews or other User Content (each as defined below);",
          "Cancel pending or confirmed bids or Reservations; and/or",
          "Suspend or revoke any credits, incentive offers, ambassador status, or special status associated with your account or bookings.",
        ]}
      />
      <LegalP key="b-18a">
        In addition, Death Is A Deadline may take any action we determine is reasonably necessary to comply with
        applicable law or the order or request of a court, law enforcement, or other administrative agency or
        governmental body.
      </LegalP>
      <LegalP key="b-18b">
        If your access to or use of the Service has been limited, your account has been suspended, or this agreement
        has been terminated by us, you are not entitled to a restoration of your account and may not register a new
        account or access or use the Service through another user&apos;s account.
      </LegalP>
      <LegalP key="b-18c">
        If you believe another user or any User Content poses an imminent risk of harm to a person or property, you
        should immediately contact law enforcement authorities. In addition, if you believe that another user or any
        User Content has violated these Terms, please report your concerns to us at the contact address in Section
        15(n). Except as required by law, you agree that we are not obligated to take action in response to any
        report. Our decision not to act on a particular breach is not a waiver of our right to act on the same or
        any other breach in the future. We have no obligation to investigate any report or to take any particular
        action.
      </LegalP>
      <LegalH3 key="b-19">Termination.</LegalH3>
      <LegalP key="b-20">
        You may terminate this agreement at any time by sending us an email or by deleting your account; deleting
        your account does not entitle you to any refund of an accepted bid. Death Is A Deadline may terminate this
        agreement for any reason by sending notice to any contact information you have provided for your account.
      </LegalP>
      <LegalH3 key="b-20b">3.4 Risk-Based Authentication and Step-Up Verification</LegalH3>
      <LegalP key="b-20c">
        We use automated and manual fraud-detection tools, including risk-scoring signals from our payment processor
        (Stripe) and third-party identity-verification providers, to evaluate Bids and accounts. We may, at any time
        and in our sole discretion: (i) require additional verification before accepting a Bid, including step-up
        payment authentication (such as 3-D Secure) or re-verification of your academic credentials; (ii) decline to
        process a Bid or accept a payment method; (iii) place a temporary hold on an account pending review; or (iv)
        cancel an accepted Bid if we determine that the Bid or the associated account presents an unacceptable risk.
        We have no obligation to explain the specific risk signals that informed any decision under this Section
        3.4, except as required by Section 4.4 of our Privacy Policy (which addresses your right to seek human review
        of decisions made solely by automated means).
      </LegalP>

      <LegalH2 key="b-21">4. Search Ranking and the Blind Bidding Process</LegalH2>
      <LegalH3 key="b-22">4.1 Search and Ranking</LegalH3>
      <LegalP key="b-23">
        You can search for Accommodations on the Application by using criteria such as destination and travel dates.
        The Service shows only a limited number of Hotels in search results, and we rank them based on their
        relevance to your search and other criteria. We use a variety of factors to determine search rankings,
        including location, category, competitiveness of the Hotel&apos;s rates, real-time availability, customer
        reviews and prior bookings on Death Is A Deadline, the compensation we earn for listing the Hotel and
        facilitating your booking, and personalization based on your preferences and other data related to your
        search criteria. In order to continually optimize our Service, we may test different ranking algorithms from
        time to time. To refine your search results, you may be able to filter by the number of rooms, number of
        beds, amenities, or other criteria.
      </LegalP>
      <LegalH3 key="b-24">4.2 Submitting a Bid</LegalH3>
      <LegalP key="b-25">
        When you submit a Bid, you specify (a) a Hotel, (b) a date or date range, and (c) the price you are willing
        to pay. A Bid is a binding offer. By submitting a Bid, you authorize Death Is A Deadline and its payment
        processor, Stripe, to place a temporary authorization hold on your payment method for the amount of your
        Bid. An authorization hold is not a completed charge and does not transfer funds to Death Is A Deadline or
        the Hotel. The authorization hold remains in place while your Bid is evaluated against the Hotel&apos;s
        confidential Floor Base.
      </LegalP>
      <LegalH3 key="b-26">4.3 Floor Base; Acceptance and Charging; Rejection</LegalH3>
      <LegalP key="b-27">
        If your Bid meets or exceeds the applicable Floor Base, your Bid is accepted and the authorization hold will
        be converted into a completed charge (also known as a &ldquo;capture&rdquo;) for the authorized amount. At
        that time, a Reservation is created and becomes final, non-cancellable, non-refundable, and non-transferable.
        If your Bid does not meet the applicable Floor Base, your Bid is rejected and the authorization hold will be
        released. The timing of the release is determined by your card issuer and financial institution and may take
        several business days to appear on your account. Death Is A Deadline does not control the speed at which
        banks remove released authorization holds.
      </LegalP>
      <LegalH3 key="b-28">4.4 Pricing Variability and No Promised Discount</LegalH3>
      <LegalP key="b-29">
        Hotel inventory, rates, and Floor Base values are dynamic. The price required to win a Bid for a given Hotel
        and date may differ from User to User, may differ from one moment to the next, and may be unavailable
        altogether. Differences may reflect real-time inventory levels, time of day, day of week, length of stay,
        occupancy patterns, the Hotel&apos;s revenue management decisions, and other factors beyond our control. We
        make no representation that any two Users will receive the same price, that prior prices will be available
        again, or that any specific Hotel will have availability on any specific date. WE DO NOT PROMISE ANY
        SPECIFIC PRICE, ANY SPECIFIC PERCENTAGE OFF RETAIL, OR ANY MINIMUM SAVINGS. Marketing references such as
        &ldquo;up to,&rdquo; &ldquo;as low as,&rdquo; or comparable language are illustrative and do not create any
        contractual entitlement. Actual savings, if any, depend on Hotel decisions, inventory, demand, dates,
        destinations, and other variables beyond our control.
      </LegalP>
      <LegalP key="b-29b">
        <strong>Total Price Disclosure.</strong> The total price displayed at checkout includes all mandatory fees
        we are charging or facilitating, other than government-imposed taxes and fees, which are itemized
        separately. We do not engage in drip pricing; if a fee is mandatory to complete the Reservation, it is
        included in the total price you see before you confirm your Bid. Optional charges (such as incidentals,
        parking, or upgrades you may choose at the Hotel) and Hotel-collected fees that are conditional on your
        conduct or choices on-site are not included and are payable directly to the Hotel.
      </LegalP>
      <LegalH3 key="b-30">4.5 Reference &ldquo;Retail&rdquo; Prices</LegalH3>
      <LegalP key="b-31">
        Listings on the Service may display a reference, list, or &ldquo;rack&rdquo; price (a &ldquo;Retail
        Price&rdquo;) for comparative or informational purposes. We do not independently audit, verify, or guarantee
        that any Retail Price reflects the actual current publicly available rate at the Hotel. Retail Price
        displays may be supplied or suggested by the Hotel, by third-party data feeds, or by historical reference,
        and they may be outdated or inaccurate. You should treat Retail Prices as indicative only and not as a
        representation by us.
      </LegalP>

      <LegalH2 key="b-32">5. Content and Reviews</LegalH2>
      <LegalH3 key="b-33">Hotel Content.</LegalH3>
      <LegalP key="b-34">
        Hotels provide us with information about the Accommodations they wish to offer through the Service,
        including property name, address, amenities, photos, and reference Retail Prices (&ldquo;Hotel
        Content&rdquo;). Death Is A Deadline is not responsible for the accuracy of images, descriptions, Retail
        Prices, or other content provided by Hotels and disclaims all liability for any errors or inaccuracies in
        Hotel Content. Hotel photos that appear on the Service are representative of the approximate type and standard
        of the Accommodations offered by the Hotel and should not be construed as guarantees of the Accommodations
        you will receive.
      </LegalP>
      <LegalH3 key="b-35-h">User Content.</LegalH3>
      <LegalP key="b-35">
        Parts of the Service enable you to provide text, photos, Reviews, identification documents (for verification
        only), and other content in connection with your use of the Service or hotel stay (&ldquo;User
        Content&rdquo;). User Content includes communications to our customer service team, as well as feedback,
        comments, and suggestions for improvements to the Service. By providing User Content (other than
        identification documents submitted solely for verification, which we will use only as described in our
        Privacy Policy), you agree that the User Content is non-confidential and you grant Death Is A Deadline a
        non-exclusive, worldwide, royalty-free, irrevocable, perpetual, sub-licensable, and transferable license to
        copy, modify, prepare derivative works of, distribute, publish, and otherwise exploit that User Content
        (including the name that you submit in connection with such User Content), without limitation. You are solely
        responsible for all User Content you provide, and you warrant that you either own it or are authorized to
        grant us the rights described in these Terms. You are responsible and liable if any of your User Content
        violates or infringes the intellectual property or privacy rights of any third party and for any other damages
        or harm resulting from your submission of User Content. You agree never to post or transmit to or from the
        Service:
      </LegalP>
      <LegalUl
        key="b-36"
        items={[
          "Any advertising or other commercial material or content, including company logos, links, or company names;",
          "Spam, unwanted contact, or content that is shared repeatedly in a disruptive manner;",
          "Content that endorses or promotes illegal or harmful activity, or that is discriminatory, obscene, sexually explicit, violent, graphic, threatening, harassing, or otherwise offensive;",
          "Content that is illegal or violates another person's or entity's rights, including intellectual property rights and privacy rights; or",
          "Content that includes another person's private or confidential information.",
        ]}
      />
      <LegalP key="b-36b">
        We have no obligation to post User Content that you submit, and we reserve the right to remove any User
        Content, in whole or in part, that violates these Terms.
      </LegalP>
      <LegalH3 key="b-37">Guest Reviews.</LegalH3>
      <LegalP key="b-38">
        Following a hotel stay booked through the Service, you may have an opportunity to submit a review of your
        stay at the Accommodation (each, a &ldquo;Review&rdquo;). Reviews are not verified by Death Is A Deadline
        for accuracy, and we claim no affiliation with or endorsement of any photos or Reviews submitted by users.
        Your Review, including any photos you submit, must be accurate and not contain any discriminatory, offensive,
        defamatory, or other content prohibited by these Terms. The following types of Reviews are also prohibited:
        (i) Reviews that are biased or exhibit indications of extortion, incentivization, conflicts of interest, or
        direct competition; and (ii) Reviews that contain no relevant information about your stay at the
        Accommodation. Nothing in these Terms restricts your right to make any statement about your experience with
        the Service or any Hotel, and we do not impose, and disclaim, any non-disparagement obligation under
        California Civil Code Section 1670.8. We may, however, decline to post or may remove any User Content for
        the reasons described in this Section 5.
      </LegalP>
      <LegalH3 key="b-40">No Reliance on Reviews</LegalH3>
      <LegalP key="b-39">
        Reviews, ratings, photos, and other user-generated content available through the Service are provided for
        informational purposes only and reflect the opinions of individual users. Death Is A Deadline does not
        verify the accuracy, completeness, or reliability of Reviews or other user-generated content and does not
        endorse any opinions expressed therein. You agree that you do not rely on Reviews or user-generated content
        when making booking decisions, and that such content does not constitute a representation or warranty by
        Death Is A Deadline regarding any Accommodation.
      </LegalP>

      <LegalH2 key="b-41">6. Bidding and Booking through the Service; Rates, Taxes, and Fees</LegalH2>
      <LegalP key="b-42">
        You should carefully review the description in the Application of the Accommodation for which you intend to
        bid to ensure you (and any additional guests you are bidding for) meet any minimum age, identification,
        occupancy, or other requirements of the Hotel. By submitting a Bid through the Service, you authorize Death
        Is A Deadline to (i) evaluate your Bid against the applicable Floor Base, (ii) facilitate the resulting
        reservation on your behalf, including making payment arrangements with the Hotel, and (iii) charge your
        payment method, through Stripe, for the total reservation price upon acceptance. You agree to pay all charges
        for any accepted Bid, including the nightly room price, applicable taxes and fees, and any other charges
        identified during checkout in the Application. You are responsible for paying the Hotel directly for any
        incidentals, room upgrades, resort fees, destination fees, parking, taxes, deposits, or other fees due
        on-site at the Hotel, as well as any associated taxes.
      </LegalP>
      <LegalH3 key="b-42b">6.0 Checkout Disclosure and Express Authorization</LegalH3>
      <LegalP key="b-42c">
        Before you confirm a Bid, the Service will display, on a single confirmation screen: (a) the name of the
        Hotel (once your Bid has been matched), the dates of stay, and the number of guests; (b) the per-night room
        rate; (c) the total room rate for the stay; (d) any non-refundable service or facilitation fee we retain as
        compensation for our services; (e) a disclosure that additional taxes, occupancy taxes, resort fees, parking
        fees, destination fees, and other Hotel-imposed charges may be collected directly by the Hotel at check-in,
        check-out, or during the stay and are not included in the Bid Amount unless expressly stated during
        checkout; (f) the maximum amount that may be charged to your payment method if your Bid is accepted; (g) the
        identity of Death Is A Deadline (through Stripe) as the merchant of record on your card statement and the
        descriptor that will appear on your statement; and (h) the date and time at which the charge will be processed
        (typically within minutes of Bid acceptance). By clicking &ldquo;Confirm Bid&rdquo; (or any equivalent button
        we may use), you expressly authorize this charge, acknowledge that the Reservation is final,
        non-cancellable, non-refundable, and non-transferable in accordance with Section 6.1, and confirm that the
        Hotel may apply additional charges directly to you at check-in or during your stay in accordance with Section
        8.
      </LegalP>
      <LegalH3 key="b-43">6.1 Reservations Are Final; No Cancellations or Refunds</LegalH3>
      <LegalP key="b-44">
        Because accepted Bids create immediate, confirmed Reservations in the Hotel&apos;s system at a deeply
        discounted, non-public price, all accepted Bids are final, non-cancellable, non-refundable, non-changeable,
        and non-transferable. We do not provide refunds, date changes, name changes, room-type changes, or
        cancellations for any reason attributable to you or to factors outside our control, including but not limited
        to change of plans, weather, illness, missed travel, denied boarding, school schedule changes, exam
        conflicts, or dissatisfaction with the Hotel. If the Hotel is unable to honor your Reservation due to its own
        conduct (for example, an overbooking by the Hotel), Section 7 governs our role in seeking alternative
        accommodations and any goodwill credit we may, in our sole discretion, provide. You should not submit a Bid
        unless you are prepared to be charged and to honor the Reservation. By submitting a Bid, you expressly
        acknowledge and agree that the Reservation is final and non-refundable. We are not responsible for missed
        stays, delayed travel, transportation issues, or inability to check in due to events outside our control.
      </LegalP>
      <LegalH3 key="b-45">6.2 Payment Processing through Stripe</LegalH3>
      <LegalP key="b-46">
        All payments are processed through Stripe. By providing a payment method, you represent that you are
        authorized to use it, that the information you provide is accurate, and that you authorize Death Is A
        Deadline and Stripe to charge your payment method for accepted Bids and any associated taxes, fees,
        surcharges, or currency conversion costs disclosed at checkout. Your use of Stripe is subject to
        Stripe&apos;s own terms and privacy policy. Some banks and credit card companies may impose currency
        conversion fees or foreign transaction fees. Death Is A Deadline is not responsible for any such fees. Please
        contact your credit card provider or bank if you have any questions about fees imposed by these third
        parties.
      </LegalP>
      <LegalH3 key="b-47">6.3 Service Fees; Compensation</LegalH3>
      <LegalP key="b-48">
        The total amount displayed in the Application during checkout, before you confirm your Bid, includes the room
        rate matched against the Hotel&apos;s Floor Base and any non-refundable service or facilitation fee we retain
        as compensation for our services. Government-imposed taxes and fees are generally not included in the Bid
        Amount and may be collected separately by the Hotel at check-in, check-out, or during the stay, as required
        by applicable law. No mandatory charges related to your Bid are added after you confirm. Death Is A Deadline
        makes no guarantee that the prices offered by Hotels through the Service represent (i) the lowest price then
        available for the same hotel room, (ii) any specific discount off the published price for a hotel room on
        another website or publication not affiliated with Death Is A Deadline, or (iii) any specific savings off the
        displayed Retail Price.
      </LegalP>
      <LegalH3 key="b-49">6.4 Taxes and Fees</LegalH3>
      <LegalP key="b-50">
        Taxes, resort fees, parking fees, destination fees, and other charges imposed by a Hotel or governmental
        authority may not be included in a Bid Amount displayed in the Application. Such charges may be collected
        separately by the Hotel at check-in, check-out, or during the stay. Users are solely responsible for paying
        any applicable taxes, fees, surcharges, or other charges assessed by the Hotel. Student Deadline Inc. does
        not calculate, collect, report, or remit occupancy, lodging, tourism, sales, use, or similar taxes on behalf
        of Hotels unless expressly stated during checkout. Hotels remain solely responsible for calculating,
        collecting, reporting, and remitting all applicable taxes and governmental charges associated with the
        reservation.
      </LegalP>
      <LegalH3 key="b-51">6.5 Chargebacks</LegalH3>
      <LegalP key="b-52">
        Because accepted Bids are final and non-refundable, you agree to contact our customer support team to attempt
        to resolve any billing concern before initiating a chargeback with your card issuer. Nothing in these Terms
        limits any right you have under the Fair Credit Billing Act, 15 U.S.C. § 1666 et seq., Regulation Z, your
        cardholder agreement, or other applicable consumer protection law to dispute a charge with your card
        issuer. If, however, you initiate a chargeback for a Bid that was accurately processed in accordance with
        these Terms and that you authorized, we may, in addition to any rights we have under applicable law: (i)
        provide evidence of the transaction to your card issuer; (ii) suspend or terminate your account; and (iii)
        recover from you any chargeback fees and reasonable collection costs we incur as a result of the disputed
        transaction. We will not retaliate against you for asserting a good-faith dispute.
      </LegalP>

      <LegalH2 key="b-53">7. Hotel Overbooking, Availability, and Cancellations</LegalH2>
      <LegalP key="b-54">
        Hotel inventory on the Service is provided by Hotels and is subject to change without notice. Some Hotels may
        not have availability on the dates you are interested in booking, and some Hotels listed for browsing may
        decline all Bids for a given date. We do not guarantee that any particular Hotel, room type, view, bed
        configuration, or date will be available, that any Bid will be accepted, or that prior availability will
        recur. Acceptance of any individual Bid is at the Hotel&apos;s sole discretion based on its Floor Base. If a
        Hotel is unable to honor your Reservation, please contact us immediately. We will do our best to work with
        you and the Hotel to find alternative accommodations, but we do not guarantee that we will be able to rebook
        your Reservation. We may, in our sole discretion, provide a credit toward a future Reservation for a booking
        cancelled or otherwise not honored by a Hotel. Any such credit is offered as a goodwill measure, is not a
        refund, is not a warranty or guarantee of any specific outcome, is non-transferable, expires twelve (12)
        months from issuance, and is not an admission of liability or fault by Death Is A Deadline. Reservations made
        on the Service are non-cancellable and non-refundable unless otherwise specified during checkout for your
        booking or otherwise permitted by our policies or terms.
      </LegalP>

      <LegalH2 key="b-55">8. Room Assignments, Check-In, and Your Relationship with the Hotel</LegalH2>
      <LegalH3 key="b-56">8.1 We Transmit; the Hotel Performs</LegalH3>
      <LegalP key="b-57">
        Once a Bid is accepted, we transmit the Reservation to the Hotel&apos;s reservation or property-management
        system. From that point, the legal and operational relationship is between you and the Hotel. The Hotel is
        responsible for providing the room and any associated services. We do not own, operate, manage, control,
        staff, supervise, or insure any Hotel.
      </LegalP>
      <LegalH3 key="b-58">8.2 What Happens at the Hotel</LegalH3>
      <LegalNotice key="b-59">
        ONCE YOUR RESERVATION IS TRANSMITTED TO THE HOTEL, DEATH IS A DEADLINE IS NOT RESPONSIBLE FOR THE ACTS OR
        OMISSIONS OF THE HOTEL OR ITS PERSONNEL, AND NOT FOR ANY EVENT AT THE HOTEL OR DURING YOUR STAY, EXCEPT TO
        THE LIMITED EXTENT REQUIRED BY APPLICABLE LAW. This includes, without limitation: check-in or check-out
        experience; room condition, cleanliness, or amenities; misallocation, walk-overs, or overbooking by the
        Hotel; ID, age, occupancy, or credit-card requirements imposed by the Hotel at check-in; incidental charges,
        deposits, resort fees, parking, taxes, or other fees the Hotel collects directly; loss, theft, damage,
        illness, personal injury, or property damage at the Hotel; disputes about charges, service, or
        accommodations; or any conduct of Hotel staff or other guests. Disputes of these kinds must be raised directly
        with the Hotel.
      </LegalNotice>
      <LegalH3 key="b-61">8.3 Check-In Requirements; Separate Hotel Hold</LegalH3>
      <LegalP key="b-62">
        Upon check-in at the Hotel, you may be required to present a form of payment acceptable to the Hotel (such as
        a credit card or cash deposit) to cover incidental expenses you may incur during your stay (for example, room
        service, parking, in-room purchases, damage, or smoking violations). The Hotel — not Death Is A Deadline —
        will determine the amount and method of any such hold, deposit, or charge. Any amount the Hotel
        pre-authorizes, deposits, or charges at the Hotel is separate from, and in addition to, the prepaid
        Reservation amount we have already charged on your card. We do not control the timing or release of any hold
        the Hotel places on your payment method. Please confirm these details with the Hotel prior to your travel.
        You may also be required to present a passport or other valid government-issued photo ID, depending on the
        jurisdiction.
      </LegalP>
      <LegalH3 key="b-63">8.4 Room Assignments and Special Requests</LegalH3>
      <LegalP key="b-64">
        All rooms booked through Death Is A Deadline can accommodate two guests unless otherwise specified in the
        Hotel&apos;s profile on the Application. You may not exceed the maximum number of allowed guests. Any extra
        guests are at the Hotel&apos;s discretion and may be subject to additional fees imposed by the Hotel. Unless
        otherwise specified, no specific room type is guaranteed with your booking. Room assignments are based on
        availability and are at the Hotel&apos;s discretion. If you have special requests (including bed types,
        preferences for smoking or non-smoking rooms, a specific room, floor location, pet accommodations, or
        wheelchair or other accessibility needs), you must contact the Hotel directly to inquire whether special
        requests can be met or if additional fees would be charged. Death Is A Deadline has no control over which
        room a Hotel will assign to you and cannot guarantee special requests in advance of your booking. Contact the
        Hotel if you will be checking in late. If you fail to check in to your Accommodation on the date and time of
        your Reservation, the remaining portion of your Reservation with the Hotel may be cancelled, and you will not
        be entitled to a refund.
      </LegalP>
      <LegalH3 key="b-65">8.5 Identity at Check-In</LegalH3>
      <LegalP key="b-66">
        Reservations are generally non-transferable and must be honored in the name of the verified User who placed
        the Bid. The Hotel may refuse check-in if the guest of record cannot present matching identification.
      </LegalP>

      <LegalH2 key="b-67">9. Disclaimer of Warranties</LegalH2>
      <LegalNotice key="b-68">
        WE PROVIDE THE SERVICE &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, AND
        WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING ALL WARRANTIES OF MERCHANTABILITY, FITNESS
        FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT AND WARRANTIES THAT THE SERVICE IS FREE OF VIRUSES OR
        OTHER HARMFUL COMPONENTS. YOUR USE OF THE SERVICE AND YOUR CONTACT, INTERACTION, OR DEALINGS WITH ANY THIRD
        PARTIES ARISING OUT OF YOUR USE OF THE SERVICE, INCLUDING YOUR HOTEL STAY WITH ANY HOTEL, IS SOLELY AT YOUR
        OWN RISK.
      </LegalNotice>
      <LegalNotice key="b-69">
        HOTELS OFFERING ACCOMMODATIONS THROUGH DEATH IS A DEADLINE ARE INDEPENDENT CONTRACTORS AND NOT AGENTS OR
        EMPLOYEES OF DEATH IS A DEADLINE. WE DO NOT ENDORSE OR WARRANT THE PERFORMANCE, SAFETY, QUALITY, LEGALITY, OR
        SUITABILITY OF ANY HOTEL ACCOMMODATION, AND WE NEITHER GUARANTEE NOR INSURE THE SERVICE TO BE PROVIDED BY ANY
        HOTEL. WE ARE NOT RESPONSIBLE FOR THE ACTS, ERRORS, OMISSIONS, REPRESENTATIONS, WARRANTIES, BREACHES, OR
        NEGLIGENCE OF HOTELS OR ANY OTHER PARTY NOT UNDER OUR CONTROL, AND WE ASSUME NO LIABILITY FOR ANY ILLNESS,
        BODILY INJURY (INCLUDING DEATH), DISABILITY, THEFT, PROPERTY DAMAGE, OR OTHER DAMAGES OR EXPENSES ARISING FROM
        YOUR STAY AT AN ACCOMMODATION.
      </LegalNotice>
      <LegalNotice key="b-70">
        WITHOUT LIMITING THE FOREGOING, WE MAKE NO WARRANTY THAT (A) ANY HOTEL WILL HAVE AVAILABILITY ON ANY
        PARTICULAR DATE; (B) ANY SPECIFIC PRICE, DISCOUNT, OR PERCENTAGE OFF WILL BE ACHIEVED; (C) RETAIL PRICES
        DISPLAYED ARE ACCURATE OR CURRENT; (D) PRICING WILL BE THE SAME ACROSS USERS; OR (E) ALL USERS ON THE
        PLATFORM ARE VERIFIED MEMBERS OF THE ACADEMIC COMMUNITY.
      </LegalNotice>
      <LegalH3 key="b-71">No Insurance Coverage</LegalH3>
      <LegalP key="b-72">
        Death Is A Deadline does not provide travel insurance, trip protection, or any form of insurance coverage in
        connection with the Service or any Reservation. Any insurance or protection products must be purchased
        separately through third-party providers. You acknowledge that you are solely responsible for obtaining any
        insurance coverage you deem necessary, including coverage for trip cancellations, delays, personal injury,
        property loss, or other risks associated with travel.
      </LegalP>
      <LegalP key="b-73">
        We also do not warrant the performance or non-interruption of the Service or that the Service will be
        compatible or interoperable with your device or any other hardware, software, or equipment installed on or
        used in connection with your device.
      </LegalP>
      <LegalP key="b-74">
        The disclaimers in these Terms apply to the maximum extent permitted by law. If you have statutorily required
        rights or warranties that cannot be disclaimed, the duration of any such statutorily required rights or
        warranties will be limited to the maximum extent permitted by law. We strongly recommend that you purchase
        travel insurance where appropriate.
      </LegalP>

      <LegalH2 key="b-90">10. Limitations on Liability</LegalH2>
      <LegalNotice key="b-91">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER DEATH IS A DEADLINE NOR ITS AFFILIATES OR PERSONNEL WILL BE
        LIABLE FOR ANY INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, LOSS OF
        DATA OR LOSS OF GOODWILL, SERVICE INTERRUPTION, COMPUTER DAMAGE OR SYSTEM FAILURE OR THE COST OF SUBSTITUTE
        PRODUCTS OR SERVICES, OR FOR ANY DAMAGES FOR PERSONAL OR BODILY INJURY OR EMOTIONAL DISTRESS ARISING OUT OF
        OR IN CONNECTION WITH (A) THESE TERMS; (B) THE USE OF OR INABILITY TO USE THE SERVICE; OR (C) BOOKING OF AN
        ACCOMMODATION, INCLUDING USE OF HOTEL SERVICES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING
        NEGLIGENCE), PRODUCT LIABILITY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT YOU OR DEATH IS A DEADLINE HAVE
        BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE, EVEN IF A LIMITED REMEDY SET FORTH IN THESE TERMS IS FOUND
        TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
      </LegalNotice>
      <LegalNotice key="b-92">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL DEATH IS A DEADLINE&apos;S AGGREGATE LIABILITY
        ARISING OUT OF OR IN CONNECTION WITH THESE TERMS, YOUR USE OF OR INABILITY TO USE THE SERVICE, OR BOOKING OF
        AN ACCOMMODATION (INCLUDING USE OF HOTEL SERVICES) EXCEED THE AMOUNTS YOU HAVE PAID DEATH IS A DEADLINE FOR
        BOOKINGS OF ACCOMMODATIONS VIA THE SERVICE AS A GUEST IN THE TWELVE (12) MONTH PERIOD PRIOR TO THE EVENT
        GIVING RISE TO THE LIABILITY, OR ONE HUNDRED U.S. DOLLARS (USD $100), WHICHEVER IS GREATER.
      </LegalNotice>
      <LegalP key="b-93">
        Nothing in these Terms excludes or limits liability for fraud, fraudulent misrepresentation, gross
        negligence, willful misconduct, or any other liability that cannot be excluded or limited under California
        Civil Code Section 1668 or other applicable law.
      </LegalP>
      <LegalP key="b-94">
        You acknowledge that booking discounted, opaque-rate accommodations involves inherent uncertainty and accept
        all associated risks.
      </LegalP>

      <LegalH2 key="b-108">11. Indemnification</LegalH2>
      <LegalP key="b-109">
        To the maximum extent permitted by law, you agree to release, defend (at our option), indemnify, and hold
        harmless Death Is A Deadline (including our affiliates and our and their respective officers, directors,
        employees, and agents) from and against any third-party claims, liabilities, damages, losses, and expenses,
        including reasonable legal and accounting fees, arising out of or in any way connected with: (i) your breach
        of these Terms, our Privacy Policy, or any Promotional Offer Terms (including any supplemental or additional
        terms that apply to a product or feature); (ii) your use or misuse of the Service; (iii) your interaction or
        contract with any Hotel, including any injuries, losses, or damages of any kind arising from such interaction
        or contract; (iv) any misrepresentation regarding your eligibility or .edu credentials; and (v) your breach
        of any laws, regulations, or third-party rights, including intellectual property or privacy rights. This
        indemnity does not extend to any claim to the extent caused by Death Is A Deadline&apos;s own fraud, gross
        negligence, or willful misconduct, or to any liability that cannot be subject to indemnification under
        California Civil Code Section 1668 or other applicable law.
      </LegalP>

      <LegalH2 key="b-110">12. Arbitration Agreement</LegalH2>
      <LegalNotice key="b-111">
        PLEASE READ THE FOLLOWING PARAGRAPHS CAREFULLY BECAUSE THEY PROVIDE THAT YOU AND DEATH IS A DEADLINE AGREE TO
        RESOLVE ALL DISPUTES BETWEEN US THROUGH BINDING INDIVIDUAL ARBITRATION AND INCLUDE A CLASS ACTION WAIVER AND
        JURY TRIAL WAIVER. THIS ARBITRATION AGREEMENT SUPERSEDES ALL PRIOR VERSIONS.
      </LegalNotice>
      <LegalH3 key="b-114">A. Application. This Arbitration Agreement applies to you if your country of residence or establishment is</LegalH3>
      <LegalP key="b-115">
        the United States, or if your country of residence or establishment is not the United States but you attempt
        to bring a legal claim against Death Is A Deadline in the United States.
      </LegalP>
      <LegalH3 key="b-116">B. Overview. The dispute resolution process is a two-step process: (1) an informal negotiation directly with</LegalH3>
      <LegalP key="b-117">
        Death Is A Deadline (described in paragraph (c) below), and if necessary (2) a binding individual arbitration
        in accordance with the terms of this Arbitration Agreement. You and Death Is A Deadline each retain the right
        to seek resolution of the dispute in small claims court as an alternative to arbitration. To the extent
        provided by applicable law, and except to the extent that any party seeks to enforce any final award in a
        court of competent jurisdiction, the arbitration proceedings and any information exchanged during the
        proceeding shall remain confidential.
      </LegalP>
      <LegalH3 key="b-118">C. Mandatory Pre-Arbitration Notice. At least 30 days prior to a party initiating an arbitration, you and</LegalH3>
      <LegalP key="b-119">
        Death Is A Deadline each agree to send the other party an individualized notice of the dispute in writing
        (&ldquo;Pre-Dispute Notice&rdquo;) and attempt in good faith to negotiate an informal resolution of the
        individual claim. If you are bringing the dispute, you must send your Pre-Dispute Notice to Student Deadline
        Inc. at the address in Section 15(n). If we are bringing the dispute, we will send our Pre-Dispute Notice to
        the email address associated with your account. A Pre-Dispute Notice must include: the date, your name,
        mailing address, the email address you used to set up your account, your signature, a brief description of
        the dispute, and the relief sought. If the parties are unable to resolve the dispute within the 30-day period,
        only then may either party commence arbitration.
      </LegalP>
      <LegalH3 key="b-120">D. Agreement to Arbitrate; Delegation. You and Death Is A Deadline mutually agree that any dispute,</LegalH3>
      <LegalP key="b-121">
        claim, or controversy arising out of or relating to these Terms or the applicability, breach, termination,
        validity, enforcement, or interpretation of the Terms or this agreement to arbitrate, or any use of the
        Application or Service (collectively, &ldquo;Disputes&rdquo;) will be settled by binding individual
        arbitration. Any question regarding arbitrability and the formation, enforceability, validity, scope, or
        interpretation of all or part of this Section 12 shall be resolved exclusively by an arbitrator.
      </LegalP>
      <LegalH3 key="b-122">E. Exceptions. The following causes of action are not subject to arbitration and will be brought in a judicial</LegalH3>
      <LegalP key="b-123">
        proceeding in a court of competent jurisdiction (as defined by Section 13): (i) any claim alleging actual or
        threatened infringement of a party&apos;s intellectual property rights; (ii) any claim seeking emergency
        injunctive relief based on exigent circumstances; (iii) a request for the remedy of public injunctive
        relief; (iv) any claim of vexatious litigation; or (v) any individual claim of sexual assault or sexual
        harassment arising from your use of the Service.
      </LegalP>
      <LegalH3 key="b-124">F. Arbitration Rules and Governing Law. This Arbitration Agreement evidences a transaction in interstate</LegalH3>
      <LegalP key="b-125">
        commerce and the Federal Arbitration Act governs all substantive and procedural interpretation and enforcement
        of this provision. The arbitration will be administered by JAMS in accordance with the JAMS Streamlined
        Arbitration Rules &amp; Procedures (or, where the amount in controversy exceeds the Streamlined threshold, the
        JAMS Comprehensive Arbitration Rules &amp; Procedures), then in effect, except as modified here. The JAMS Rules
        are available at www.jamsadr.com. If JAMS cannot or will not administer the arbitration, the parties shall
        confer and select an alternative arbitral forum, and if unable to agree, either party may ask a court to
        appoint an arbitrator pursuant to 9 U.S.C. § 5.
      </LegalP>
      <LegalH3 key="b-126">G. Hearing/Location. To make the arbitration cost-effective and efficient, any required hearing in an</LegalH3>
      <LegalP key="b-127">
        arbitration where the amount in controversy does not exceed $1,000,000 shall be conducted remotely via video
        conference except as otherwise agreed by the parties or instructed by the arbitrator. Any required hearing
        where the amount in controversy exceeds $1,000,000 shall be conducted in Los Angeles County, California,
        except as otherwise agreed by the parties or instructed by the arbitrator. If the amount in controversy is
        $10,000 or less, the parties agree to proceed solely on the submission of documents to the arbitrator,
        provided that the arbitrator has discretion to decide to hold a hearing in response to a reasonable and
        proportionate request from a party.
      </LegalP>
      <LegalH3 key="b-128">H. Fees. Your arbitration fees and your share of arbitrator compensation shall be governed by the rules and</LegalH3>
      <LegalP key="b-129">
        service fee schedule of the arbitration provider administering the arbitration.
      </LegalP>
      <LegalH3 key="b-130">I. Sanctions; Frivolous Claims. Either party may request that the arbitrator impose sanctions upon proving</LegalH3>
      <LegalP key="b-131">
        that the other party or its attorney(s) has asserted a claim or defense that is groundless in fact or law,
        brought in bad faith or for the purpose of harassment, or is otherwise frivolous.
      </LegalP>
      <LegalH3 key="b-132">J. Arbitrator&apos;s Decision. The arbitrator&apos;s decision shall include the essential findings and conclusions upon</LegalH3>
      <LegalP key="b-133">
        which the arbitrator based the award. Judgment on the arbitration award may be entered in any court with
        proper jurisdiction. The arbitrator may award any relief allowed by law or the applicable arbitration rules,
        but declaratory or injunctive relief may be awarded only on an individual basis and only to the extent
        necessary to provide relief warranted by the claimant&apos;s individual claim.
      </LegalP>
      <LegalH3 key="b-134">K. Jury Trial Waiver. You and Death Is A Deadline acknowledge and agree that we are each waiving the</LegalH3>
      <LegalP key="b-135">right to a trial by jury as to all arbitrable Disputes.</LegalP>
      <LegalH3 key="b-136">L. No Class Actions or Representative Proceedings. You and Death Is A Deadline acknowledge and</LegalH3>
      <LegalP key="b-137">
        agree that, to the fullest extent permitted by law, we each waive the right to participate as a plaintiff or
        class member in any purported class action lawsuit, class-wide arbitration, private attorney general action,
        or any other representative or consolidated proceeding. Unless we agree in writing, the arbitrator may not
        consolidate more than one party&apos;s claims and may not otherwise preside over any form of any class or
        representative proceeding. If there is a final judicial determination that applicable law precludes
        enforcement of the class, representative, or consolidated action waiver in this paragraph as to any claim,
        the entirety of this Section 12 (the Arbitration Agreement) shall be null and void as to that claim, and that
        claim shall be brought exclusively in a court of competent jurisdiction in Los Angeles County, California,
        pursuant to Section 13. All other claims shall remain subject to this Section 12.
      </LegalP>
      <LegalH3 key="b-138">M. Mass Action Waiver. The relative benefits and efficiencies of arbitration may be lost when 100 or more</LegalH3>
      <LegalP key="b-139">
        arbitration claims are filed within 180 days that involve the same or similarly situated parties, are based on
        the same or similar claims arising from substantially identical transactions or events, and involve the same
        or coordinated counsel for the parties (a &ldquo;Mass Action&rdquo;). Accordingly, you and Death Is A Deadline
        agree to waive the right to have any Dispute administered, arbitrated, or resolved as part of a Mass Action.
        If, notwithstanding this waiver, an arbitration proceeds as part of a Mass Action, the parties shall group
        the arbitration demands into batches of no more than 100 to be arbitrated sequentially, with the parties (or,
        failing agreement, the arbitration provider) selecting representative bellwether cases from each batch to be
        heard first.
      </LegalP>
      <LegalH3 key="b-140">N. Severability. Except as provided in Section 12(l), in the event that any portion of this Arbitration</LegalH3>
      <LegalP key="b-141">
        Agreement is deemed illegal or unenforceable, such provision will be severed and the remainder of the
        Arbitration Agreement will be given full force and effect.
      </LegalP>
      <LegalH3 key="b-142">O. Right to Opt Out of Arbitration Amendments. If we change this Section 12 after the date you last</LegalH3>
      <LegalP key="b-143">
        accepted these Terms, you may reject that change by sending us written notice (including by email to the
        address in Section 15(n)) no later than 30 days of the date the change is effective. Your notice must include
        your name, mailing address, the date of the notice, the email address you used to set up your account, your
        signature, and an unequivocal statement that you want to opt out of the amended Section 12. Rejecting a new
        change does not revoke or alter your prior consent to any earlier agreements to arbitrate.
      </LegalP>
      <LegalH3 key="b-144">P. Survival. Subject to Section 15(d), this Section 12 will survive any termination of these Terms and will</LegalH3>
      <LegalP key="b-145">
        continue to apply even if you stop using the Service or terminate your account.
      </LegalP>

      <LegalH2 key="b-146">13. Governing Law and Venue</LegalH2>
      <LegalP key="b-147">
        These Terms are governed by and construed in accordance with the laws of the State of California and the
        United States of America, without regard to conflict-of-law provisions. Except as set forth below, you and we
        both consent to venue and personal jurisdiction in Los Angeles County, California. If you reside or have a
        place of establishment in the United States, judicial proceedings (other than small claims actions) that are
        excluded from the arbitration agreement in Section 12 must be brought in state or federal court in Los Angeles
        County, California, unless we both agree to some other location.
      </LegalP>

      <LegalH2 key="b-148">14. International Users</LegalH2>
      <LegalP key="b-149">
        The Service is offered and operated from the United States and is intended for users located in the United
        States. We make no representation that the Service is appropriate or available in other locations. If you
        access the Service from outside the United States, you do so at your own initiative and are responsible for
        compliance with local laws, including any consumer protection rules that may apply. To the extent mandatory
        statutory consumer protection regulations in your country of residence contain provisions that are more
        beneficial for you, such provisions shall apply irrespective of the choice of California and U.S. law.
      </LegalP>

      <LegalH2 key="b-150">15. General Terms</LegalH2>
      <LegalH3 key="b-151">A. Modification</LegalH3>
      <LegalP key="b-152">
        We may modify these Terms at any time. When we make material changes to these Terms, we will post the revised
        Terms on the Application and update the &ldquo;Last Updated&rdquo; date at the top of these Terms. We will
        also provide you with notice of any material changes by email at least 30 days before the date they become
        effective. If you do not agree to a material change to these Terms, you may terminate your agreement by
        closing your account before the effective date of the change without any termination fee. Any Reservations
        confirmed before the effective date will continue to be governed by the version of these Terms in effect
        when they were confirmed. Your continued access to or use of the Service will constitute your acceptance of
        the revised Terms. You release Death Is A Deadline and its parent, affiliates, and their respective officers,
        directors, employees, and agents, from and against any liability for any changes to these Terms which were
        available but that you were not aware of due to your failure to update to the most recent version of the
        Application.
      </LegalP>
      <LegalH3 key="b-153">B. Notice and Electronic Communications</LegalH3>
      <LegalP key="b-154">
        Unless otherwise specified, any notices or other communications to users permitted or required under these
        Terms will be provided electronically and given by Death Is A Deadline via email, messaging service (including
        SMS), notice through the Application, or any other contact method we enable and you provide. You agree that
        all agreements, notices, disclosures, and other communications that we provide to you electronically satisfy
        any legal requirement that these communications be in writing.
      </LegalP>
      <LegalH3 key="b-155-h">C. Emails and SMS</LegalH3>
      <LegalP key="b-155">
        You will receive administrative communications from us using the email address or other contact information
        you provide for your account. Enrollment in additional email subscription programs will not affect the
        frequency of these administrative emails, though you should expect to receive additional emails specific to
        the program(s) to which you have subscribed. Electronic communications from us, including emails, may include
        marketing and promotional content, which you can opt out of receiving as provided in our Privacy Policy. No fee
        is charged for promotional emails, but third-party data rates could apply. In the U.S., if you consent to
        receive SMS (text messages) from us, Death Is A Deadline will not charge you for the text messaging; however,
        standard message and data rates may apply according to your wireless rate plan. Contact your carrier for
        pricing plans and details.
      </LegalP>
      <LegalH3 key="b-156">D. Entire Agreement; Severability; Survival</LegalH3>
      <LegalP key="b-157">
        Except as they may be supplemented by additional terms, conditions, policies, guidelines, standards, and
        in-product disclosures, these Terms (including those items incorporated by reference) constitute the entire
        agreement between Death Is A Deadline and you pertaining to your access to or use of the Service and
        supersede any and all prior oral or written understandings or agreements between Death Is A Deadline and you.
        These Terms do not and are not intended to confer any rights or remedies upon anyone other than you and Death
        Is A Deadline. If any provision of these Terms is held to be invalid or unenforceable, except as otherwise
        indicated in Section 12 above, such provision will be struck and will not affect the validity and
        enforceability of the remaining provisions. Parts of these Terms that by their nature survive termination,
        will survive termination of this agreement.
      </LegalP>
      <LegalH3 key="b-158-h">E. Assignment</LegalH3>
      <LegalP key="b-158">
        You may not assign, transfer, or delegate this agreement or your rights and obligations hereunder without our
        prior written consent. Death Is A Deadline may without restriction assign, transfer, or delegate this agreement
        and any rights and obligations hereunder, at its sole discretion, with 30 days&apos; prior notice.
      </LegalP>
      <LegalH3 key="b-159-h">F. No Waiver</LegalH3>
      <LegalP key="b-159">
        Death Is A Deadline&apos;s failure to enforce any right or provision in these Terms will not constitute a
        waiver of such right or provision unless acknowledged and agreed to by us in writing. No waiver of any right
        or provision in these Terms shall be deemed a further or continuing waiver of such term or any other term.
        Except as expressly set forth in these Terms, the exercise by either party of any of its remedies under these
        Terms will be without prejudice to its other remedies under these Terms or otherwise permitted under law.
      </LegalP>
      <LegalH3 key="b-160-h">G. Third-Party Services</LegalH3>
      <LegalP key="b-160">
        The Application may contain links to or integrations with third-party websites, applications, services, or
        resources (&ldquo;Third-Party Services&rdquo;) — including Stripe (payments), hosting and infrastructure
        providers, mapping providers, communications providers, and Hotels — that are subject to different terms
        and privacy practices. Death Is A Deadline is not responsible or liable for any aspect of such Third-Party
        Services, and links to such Third-Party Services are not an endorsement.
      </LegalP>
      <LegalH3 key="b-161-h">H. Google Terms</LegalH3>
      <LegalP key="b-161">
        Some areas of the Application implement Google Maps/Earth mapping services, including Google Maps API(s). Your
        use of Google Maps/Earth is subject to the Google Maps/Google Earth Additional Terms of Service.
      </LegalP>
      <LegalH3 key="b-162-h">I. Apple and Google Play Terms</LegalH3>
      <LegalP key="b-162">
        If you access or download the Application from the Apple App Store, you agree to Apple&apos;s Licensed
        Application End User License Agreement. If you access or download the Application from the Google Play Store,
        you agree to the Google Play Terms of Service.
      </LegalP>
      <LegalH3 key="b-163">J. Death Is A Deadline Service and Content</LegalH3>
      <LegalP key="b-164">
        The Service and content made available through the Service may be protected by copyright, trademark, patent,
        and/or other laws of the United States and other countries. Death Is A Deadline, the Death Is A Deadline word
        mark, the grim reaper / hourglass logo, the &ldquo;Life is short. Travel now.&rdquo; tagline, and related
        branding are trademarks of Student Deadline Inc. You acknowledge that all such intellectual property rights
        are the exclusive property of Death Is A Deadline and/or its licensors and agree that you will not remove,
        alter, or obscure any copyright, trademark, service mark, or other proprietary rights notices. You may not
        use, copy, adapt, modify, prepare derivative works of, distribute, license, sell, transfer, publicly display,
        publicly perform, transmit, broadcast, or otherwise exploit any content accessed through the Service except
        to the extent you are the legal owner of that content or as expressly permitted in these Terms.
      </LegalP>
      <LegalP key="b-164b">
        Subject to your compliance with these Terms, Death Is A Deadline grants you a limited, non-exclusive,
        non-sublicensable, revocable, non-transferable license to (i) download and use the Application on your
        personal device(s) and (ii) access and view the content made available on or through the Service and
        accessible to you, solely for your own personal and non-commercial use.
      </LegalP>
      <LegalH3 key="b-165">K. Copyright Notifications (DMCA)</LegalH3>
      <LegalP key="b-166">
        In accordance with the Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;) and other applicable laws, it is
        Death Is A Deadline&apos;s policy, in appropriate circumstances and in our sole discretion, to disable and/or
        terminate the account or access of users who repeatedly infringe or are repeatedly charged with infringing
        the copyrights or other intellectual property rights of others. If you are a copyright owner, authorized to
        act on behalf of one, or authorized to act under any exclusive right under copyright, and you believe content
        on the Service infringes your copyright(s), please send to our designated Copyright Agent a written DMCA
        Notice of Alleged Infringement with the following information:
      </LegalP>
      <LegalUl
        key="b-167"
        items={[
          "An electronic or physical signature of the person authorized to act on behalf of the owner of the copyright interest;",
          "Identification of the copyrighted work(s) you claim to have been infringed;",
          "Identification of the material that you claim is infringing or to be the subject of infringing activity and that you request us to remove;",
          "Sufficient information to permit us to locate such material (including, if applicable, the URL where such material may be found);",
          "Your name, address, telephone number, and email address; and",
          "A statement by you, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the copyright owner's behalf.",
        ]}
      />
      <LegalP key="b-167b">
        Notices can be sent to our designated Copyright Agent at the contact address in Section 15(n).
      </LegalP>
      <LegalH3 key="b-168">L. Force Majeure</LegalH3>
      <LegalP key="b-169">
        Death Is A Deadline shall not be liable for any delay or failure to perform resulting from causes outside its
        reasonable control, the consequences of which would have been unavoidable despite all efforts to the
        contrary, including, but not limited to, acts of God, natural disasters, war, terrorism, riots, embargos,
        acts of civil or military authorities, fire, floods, accidents, pandemics, epidemics or disease, strikes or
        shortages of transportation facilities, fuel, energy, labor or materials, internet or utility outages, or
        third-party platform failures (including Stripe, Hotel property-management systems, or hosting providers). If
        a force majeure event prevents you from completing a confirmed Reservation, you should contact the Hotel and
        us as soon as practicable. We may, in our sole discretion, offer a goodwill credit on the terms described in
        Section 7, but we are not obligated to do so and no force majeure event creates a refund obligation by Death
        Is A Deadline.
      </LegalP>
      <LegalH3 key="b-170">M. Seller of Travel</LegalH3>
      <LegalP key="b-171">
        Death Is A Deadline operates a marketplace for lodging only and does not sell, arrange, or advertise air or
        sea transportation or land or water transportation. We therefore are not a &ldquo;seller of travel&rdquo;
        subject to registration under California Business and Professions Code Section 17550 et seq. or the analogous
        registration statutes of Florida, Hawaii, Iowa, or Washington. If the scope of our Service changes in a way
        that would require registration, we will register and display our registration number as required by applicable
        law.
      </LegalP>
      <LegalH3 key="b-172">N. Contact Us</LegalH3>
      <LegalP key="b-173">
        If you have any questions about these Terms, or to send any notice required under these Terms, please contact
        us at:
      </LegalP>
      <LegalP key="b-174">
        Student Deadline Inc.
        <br />
        d/b/a Death Is A Deadline
        <br />
        Attn: Legal
        <br />
        Email: deadline@podshare.com
        <br />
        Site: DeadlineTravel.com and deathisadeadline.com
      </LegalP>
      <LegalCopyright text='© 2026 Student Deadline Inc. All rights reserved. Death Is A Deadline, the Death Is A Deadline logo, and "Life is short. Travel now." are trademarks of Student Deadline Inc.' />
    </>
  );
}
