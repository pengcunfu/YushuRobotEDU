declare module 'react-office-viewer' {
  import { ComponentType } from 'react';

  interface ViewerProps {
    file: string | File;
    fileName?: string;
    locale?: 'zh' | 'en';
    width?: string | number;
    height?: string | number;
    timeout?: number;
  }

  const Viewer: ComponentType<ViewerProps>;
  export default Viewer;
  
  export const SheetViewer: ComponentType<ViewerProps>;
  export const PdfViewer: ComponentType<ViewerProps>;
  export const DocxViewer: ComponentType<ViewerProps>;
}
