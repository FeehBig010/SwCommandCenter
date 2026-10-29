import {useSyncExternalStore} from 'react';
import {getAppearance,subscribeAppearance} from '../lib/appearance';
export default function useAppearance(){return useSyncExternalStore(subscribeAppearance,getAppearance,()=> 'war');}
