/** Se vuelve a montar en cada navegación: la pantalla nueva aparece con un fundido corto. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
