import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PreviewRoleProvider } from './lib/rolePreview'

const AppWithRolePreview = () => {
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true';
  
  if (isPreviewEnabled) {
    return (
      <PreviewRoleProvider>
        <App />
      </PreviewRoleProvider>
    );
  }
  
  return <App />;
};

createRoot(document.getElementById("root")!).render(<AppWithRolePreview />);
