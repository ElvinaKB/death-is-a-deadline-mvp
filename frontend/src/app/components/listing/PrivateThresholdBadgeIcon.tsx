/** Tag / hexagon badge with star — retail private threshold mockup */
export function PrivateThresholdBadgeIcon({
  className = "h-12 w-12",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 2L30 7.5V20.5C30 29.5 25 36.5 18 42C11 36.5 6 29.5 6 20.5V7.5L18 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M18 17.5L19.6 22H24.2L20.4 24.6L22 29.1L18 26.6L14 29.1L15.6 24.6L11.8 22H16.4L18 17.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
