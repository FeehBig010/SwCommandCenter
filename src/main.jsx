import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AppMotion from './components/AppMotion';
import './styles.css';
import './components/OptimizerWorkspace.css';
import './components/AppMotion.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><App/><AppMotion/></React.StrictMode>);
