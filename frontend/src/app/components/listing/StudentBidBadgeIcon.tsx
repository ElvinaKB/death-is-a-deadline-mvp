/** Shield badge with star — client .edu panel mockup */
export function StudentBidBadgeIcon({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 2L34 9V22C34 32 28 40 20 46C12 40 6 32 6 22V9L20 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="14" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 20L21.8 25.2H27.4L22.8 28.4L24.6 33.6L20 30.4L15.4 33.6L17.2 28.4L12.6 25.2H18.2L20 20Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
