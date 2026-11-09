export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`}><svg width="33" height="33" viewBox="0 0 40 40" fill="none" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <path key={i} d="M20 4V12.5" transform={`rotate(${i * 45} 20 20)`} stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />)}<circle cx="20" cy="20" r="4.5" fill="currentColor" /></svg>{!compact && <span>brisa<span className="brand-dot">.</span></span>}</span>;
}
