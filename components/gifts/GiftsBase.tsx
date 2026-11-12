'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { at, type GiftsBase } from '@/lib/gifts-path';

const Context = createContext<GiftsBase>('/gifts');

// Set once in the gifts layout, so client components can build links for the right host.
export function GiftsBaseProvider({ base, children }: { base: GiftsBase; children: ReactNode }) {
	return <Context.Provider value={base}>{children}</Context.Provider>;
}

// const to = useGiftsPath();  <Link href={to('/wishlist')}>
export function useGiftsPath() {
	const base = useContext(Context);
	return useCallback((path: string) => at(base, path), [base]);
}
