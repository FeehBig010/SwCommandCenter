// Destinations audited against the existing App/Sidebar; these are not new routes.
export const HOME_MODULES = Object.freeze([
  {
    id: 'account', title: 'Minha Conta', page: 'dashboard',
    description: 'Gerencie seus monstros, equipamentos e evolução.',
    detail: 'Monstros · Equipamentos · Evolução',
    scene: '/art/home/account-scene.webp',
    image: '/art/home/ciri.webp', imageAlt: 'Ciri, guia da sua conta',
  },
  {
    id: 'build', title: 'Build Lab', page: 'optimizer',
    description: 'Analise, otimize e aperfeiçoe suas builds.',
    detail: 'Runas · Otimização · Speed Tune',
    scene: '/art/home/build-scene.webp',
    image: '/art/home/build-scene.webp', imageAlt: 'Portal dimensional do laboratório de builds',
  },
  {
    id: 'guild', title: 'Guild Center', page: 'guild-center',
    description: 'Estratégia, colaboração e inteligência para sua guilda.',
    detail: 'Siege · Counters · Guild Intelligence',
    scene: '/art/home/guild-scene.webp',
    image: '/art/home/guild-scene.webp', imageAlt: 'Fortaleza da guilda ao anoitecer',
  },
]);

export const HOME_CARDS = Object.freeze([...HOME_MODULES,
  {id:'calculator',tool:true,title:'Calculadora Livre',description:'Monte seu time, sem arquivo ou login.',detail:'Montagem manual · Ticks · Exportação',scene:'/art/home/build-scene.webp',image:'/art/home/build-scene.webp',imageAlt:'Portal do laboratório de builds'},
  {id:'sync',tool:true,title:'Sincronizar Conta Completa',description:'Seus monstros, runas e times em um só lugar.',detail:'SWEX JSON · Inventário · Backup na nuvem',scene:'/art/home/account-scene.webp',image:'/art/home/account-scene.webp',imageAlt:'Central de comando do invocador'},
  {id:'coupons',tool:true,title:'Códigos & Eventos',description:'Consulte os códigos e as recompensas da Com2uS.',detail:'Cupons · Recompensas · Eventos',scene:'/art/home/guild-scene.webp',image:'/art/home/guild-scene.webp',imageAlt:'Fortaleza de Summoners War'},
]);

export function homeCardFromKey(key, current, count = HOME_CARDS.length) {
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current + count - 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
