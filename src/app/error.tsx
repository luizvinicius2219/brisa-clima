'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="not-found"><h1>Uma pausa entre as nuvens.</h1><p>Não foi possível abrir esta parte do Brisa.</p><button className="button-primary" onClick={reset}>Tentar novamente</button></main>; }
