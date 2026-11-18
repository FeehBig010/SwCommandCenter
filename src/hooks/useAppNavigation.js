import {useCallback,useEffect,useRef,useState} from 'react';
import {routePage,pageUrl,NAV_KEYS} from '../core/app-navigation';
// History is written only for an intentional navigation, never during rendering.
export default function useAppNavigation(){
 const [page,setCurrentPage]=useState(()=>routePage(window.location)),current=useRef(page);
 const navigate=useCallback(next=>{
  const target=typeof next==='function'?next(current.current):next,page=NAV_KEYS.has(target)?target:'portal';
  if(page===current.current)return;
  window.history.pushState(null,'',pageUrl(page,window.location.href));current.current=page;setCurrentPage(page);
 },[]);
 useEffect(()=>{
  const sync=()=>{const page=routePage(window.location),url=pageUrl(page,window.location.href);if(url!==window.location.pathname+window.location.search+window.location.hash)window.history.replaceState(null,'',url);current.current=page;setCurrentPage(page);};
  sync();window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
  return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
 },[]);
 return [page,navigate];
}
