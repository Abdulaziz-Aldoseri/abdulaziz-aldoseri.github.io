import type { APIRoute } from 'astro';
import { studies, isHidden } from '../data/studies';
const routes=['','projects/','projects/evidence/','cv/',...Object.values(studies).filter(s=>s.evidence.stage==='evaluated'&&s.evidence.independentlyReviewed&&!isHidden(s)).map(s=>s.route)];
export const GET: APIRoute = ({site}) => new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(p=>`<url><loc>${new URL(p,site)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});
