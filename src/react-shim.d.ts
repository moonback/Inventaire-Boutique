declare module "react" {
  export type ReactNode = any;

  export type FormEvent<T = any> = any;
  export type TouchEvent<T = any> = any;

  export function useState<S = any>(
    initialState: S | (() => S),
  ): [S, (next: S | ((prev: S) => S)) => void];

  export function useEffect(effect: any, deps?: any[]): void;

  export function useCallback<T extends (...args: any[]) => any>(
    fn: T,
    deps?: any[],
  ): T;

  export function useMemo<T>(factory: () => T, deps?: any[]): T;

  export function useRef<T = any>(initialValue: T | null): { current: T };

  export function useContext<T = any>(ctx: any): T;

  export type CSSProperties = any;

  export type ReactElement = any;

  export const Fragment: any;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

// Minimal JSX typing to avoid "JSX.IntrinsicElements missing"
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
