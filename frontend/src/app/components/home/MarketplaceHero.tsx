export function MarketplaceHero() {
  return (
    <header className="mb-6 space-y-4 border-b border-line/60 pb-6">
      <h1 className="font-serif text-[1.65rem] md:text-[2.5rem] leading-[1.12] tracking-tight">
        <span className="block text-fg">WE HAVE A</span>
        <span className="block text-gold">SECRET PRICE.</span>
        <span className="block text-fg">CAN YOU GUESS IT?</span>
      </h1>
      <div className="h-px w-14 bg-gold" aria-hidden />
      <div className="space-y-1 text-sm md:text-base text-[hsl(0_0%_72%)] leading-relaxed max-w-xl">
        <p>It&apos;s not an auction. It&apos;s a guessing game.</p>
        <p>Match the hotel&apos;s secret price to win the room.</p>
      </div>
    </header>
  );
}
