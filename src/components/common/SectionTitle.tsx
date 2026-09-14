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
      {eyebrow && (
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.09em] text-brand-700">{eyebrow}</span>
      )}
      <h2 className="text-pretty text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.028em] text-brand-900">
        {title}
      </h2>
      {subtitle && <p className="text-pretty text-base leading-relaxed text-ink-secondary">{subtitle}</p>}
    </div>
  );
}

export default SectionTitle;
