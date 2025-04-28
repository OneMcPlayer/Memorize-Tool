import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { showToast } from './utils';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Delay service worker registration until after the page has loaded
    setTimeout(() => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);

          // Handle service worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  showToast('New version available! Refresh to update.', 5000, 'info');

                  // Add a refresh button to the toast
                  const refreshButton = document.createElement('button');
                  refreshButton.textContent = 'Refresh Now';
                  refreshButton.className = 'toast-button';
                  refreshButton.onclick = () => window.location.reload();

                  // Find the toast element and append the button
                  const toastElement = document.querySelector('.toast');
                  if (toastElement) {
                    toastElement.appendChild(refreshButton);
                  }
                } else {
                  // Content is cached for offline use
                  console.log('Content is cached for offline use');
                  showToast('App is ready for offline use', 3000, 'success');
                }
              }
            };
          };
        })
        .catch(error => {
          console.error('Error registering service worker:', error);
          // Don't show an error toast to users - service worker is an enhancement
          // and the app should work fine without it
        });
    }, 1000); // Delay registration by 1 second
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
