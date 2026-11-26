import type { AnchorHTMLAttributes, Ref } from 'react';

/**
 * En la app reemplaza a `next/link` dentro de las pantallas compartidas con la web. No navega: avisa a dónde se quiso ir
 * y la pantalla decide (casi siempre, que eso todavía está sólo en la web).
 */
export default function Link({ href, onClick, ref, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> }) {
  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        window.dispatchEvent(new CustomEvent('forza:link', { detail: href }));
      }}
    />
  );
}
