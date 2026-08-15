declare const sandkit: {
  api: Record<string, any>;
  react: {
    createElement: (...args: any[]) => any;
    Fragment?: any;
  };
};

declare const React: typeof import("react");

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}
