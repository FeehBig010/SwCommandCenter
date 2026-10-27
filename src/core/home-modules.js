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

export function homeCardFromKey(key, current, count = HOME_MODULES.length) {
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current + count - 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
