import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'

// We zoeken het 'root' element uit je index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React is succesvol geladen in de root!");
} else {
  console.error("Fout: Kon het element met id 'root' niet vinden in de HTML.");
}
