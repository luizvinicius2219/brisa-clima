import Link from 'next/link';
import { Brand } from '@/components/brand';

export default function NotFound() { return <main className="not-found"><Brand /><h1>Esse céu ainda não foi mapeado.</h1><p>A página que você procurou não está por aqui.</p><Link className="button-primary" href="/">Voltar para o Brisa</Link></main>; }
