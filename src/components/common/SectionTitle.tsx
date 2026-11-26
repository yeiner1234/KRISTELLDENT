interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

function SectionTitle({ eyebrow, title, subtitle, align = 'center' }: SectionTitleProps) {
  const alignment = align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${alignment}`}>
      {/* Solo la web pública usa eyebrow: rosa Kristell, como el logotipo. */}
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-kd-pink-700">
          <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-kd-pink-500" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-pretty text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.028em] text-brand-900">
        {title}
      </h2>
      {subtitle && <p className="text-pretty text-base leading-relaxed text-ink-secondary">{subtitle}</p>}
    </div>
  );
}

export default SectionTitle;
