/* ===========================================================================
   COMPOSE — mobile / responsive primitives
   Shared by ALL four builds (loaded before app.jsx). Nothing here is build-
   specific: app.jsx decides WHEN to use these based on useIsMobile(). Keeping
   the phone layout in the same codebase means every future edit to a view or
   style lands on desktop and mobile at once — no second build to maintain.

   Classic-script scope: these top-level declarations are visible to app.jsx
   (same global lexical environment as components.jsx / views.jsx).
   =========================================================================== */

/* Reactive "are we on a phone-sized screen?" with a manual override.
   The override (lc2-force-layout = 'mobile' | 'desktop') powers the
   "Desktop site" / "Mobile site" switch in the More sheet / Settings. */
function useIsMobile(breakpoint) {
  const bp = breakpoint || 760;
  const compute = () => {
    let forced = null;
    try { forced = localStorage.getItem('lc2-force-layout'); } catch (e) {}
    if (forced === 'desktop') return false;
    if (forced === 'mobile') return true;
    const w = (typeof window !== 'undefined') ? window.innerWidth : 1200;
    return w <= bp;
  };
  const [mobile, setMobile] = React.useState(compute);
  React.useEffect(() => {
    const on = () => setMobile(compute());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.addEventListener('storage', on); // sync across the force-layout toggle
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.removeEventListener('storage', on);
    };
  }, [bp]);
  return mobile;
}

/* Read / set the layout override. Writing dispatches a storage-like event so
   useIsMobile re-evaluates in the same tab (native 'storage' only fires in
   *other* tabs). */
function setForceLayout(val) {
  try {
    if (val == null) localStorage.removeItem('lc2-force-layout');
    else localStorage.setItem('lc2-force-layout', val);
  } catch (e) {}
  try { window.dispatchEvent(new Event('resize')); } catch (e) {}
}
function getForceLayout() {
  try { return localStorage.getItem('lc2-force-layout'); } catch (e) { return null; }
}

/* Slide-in panel with a dimmed backdrop.
   side: 'bottom' (default) | 'left' | 'right' | 'full'
   Locks body scroll while open; closes on backdrop tap or Esc. */
function Sheet({ title, side, onClose, children, footer, className }) {
  const s = side || 'bottom';
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className={'sheet-backdrop sheet-back-' + s} onClick={onClose}>
      <div className={'sheet sheet-' + s + (className ? ' ' + className : '')}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title || 'Panel'}>
        {s === 'bottom' && <div className="sheet-grip" aria-hidden="true"><span /></div>}
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer != null && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* Fixed bottom navigation. items: [{id, label, ico, badge?}]. */
function MobileTabBar({ items, active, onTab }) {
  return (
    <nav className="mtabbar" role="tablist" style={{ gridTemplateColumns: 'repeat(' + items.length + ', 1fr)' }}>
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={active === it.id}
          className={'mtab' + (active === it.id ? ' on' : '')}
          onClick={() => onTab(it.id)}>
          <span className="mtab-ico" aria-hidden="true">{it.ico}</span>
          <span className="mtab-label">{it.label}</span>
          {it.badge != null && it.badge !== '' && <span className="mtab-badge">{it.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
