import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCarouselProps {
  children: ReactNode;
  // Nombre de la fila para lectores de pantalla (p. ej. "Especialidades").
  ariaLabel: string;
  // Ancho de cada tarjeta. Por defecto: casi toda la pantalla en celular,
  // dos en tablet y tres en escritorio.
  itemClassName?: string;
}

// En celular la fila ocupa todo el ancho de la pantalla (100vw): con tarjetas
// de 80vw y 10vw de margen a cada lado, la tarjeta queda centrada y asoman la
// anterior y la siguiente. Desde sm, alineadas a la izquierda.
const DEFAULT_ITEM = 'w-[80vw] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]';

// Tarjetas en una sola fila que se desliza de lado (con el dedo, la rueda o
// las flechas) y se detiene en cada tarjeta. En celular la tarjeta queda al
// centro y asoman las de los lados, para que se note que hay más.
function HorizontalCarousel({ children, ariaLabel, itemClassName = DEFAULT_ITEM }: HorizontalCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState({ back: false, forward: true });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    // La tarjeta activa es la que está más cerca del borde izquierdo visible.
    let closest = 0;
    slides.forEach((slide, index) => {
      if (Math.abs(slide.offsetLeft - track.scrollLeft - track.offsetLeft) < Math.abs(slides[closest].offsetLeft - track.scrollLeft - track.offsetLeft)) {
        closest = index;
      }
    });
    setActiveIndex(closest);
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScroll({ back: track.scrollLeft > 4, forward: maxScroll <= 0 ? false : track.scrollLeft < maxScroll - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    // Estado inicial: si todas las tarjetas caben, sin flechas activas.
    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  const arrowClasses =
    'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-brand-900 transition-all hover:border-brand-600/40 hover:text-brand-700 hover:shadow-soft-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex flex-col gap-5">
      <ul
        ref={trackRef}
        aria-label={ariaLabel}
        className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[10vw] pb-3 pt-1 [scrollbar-width:none] sm:scroll-px-5 sm:px-5 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <li key={index} className={`flex shrink-0 snap-center sm:snap-start ${itemClassName}`}>
            <div className="w-full">{item}</div>
          </li>
        ))}
      </ul>

      {/* Si todas las tarjetas caben, no hace falta navegar. */}
      {items.length > 1 && (canScroll.back || canScroll.forward) && (
        <div className="relative flex min-h-11 items-center justify-center">
          <div role="group" aria-label={`Elegir tarjeta de ${ariaLabel}`} className="flex flex-wrap items-center justify-center gap-1.5">
            {items.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ir a la tarjeta ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => goTo(index)}
                className="flex h-6 items-center justify-center px-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex ? 'w-6 bg-brand-600' : 'w-2 bg-brand-600/25'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-2 sm:flex">
            <button type="button" aria-label="Anterior" onClick={() => scrollByPage(-1)} disabled={!canScroll.back} className={arrowClasses}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Siguiente" onClick={() => scrollByPage(1)} disabled={!canScroll.forward} className={arrowClasses}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HorizontalCarousel;
