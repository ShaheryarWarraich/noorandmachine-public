import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Gate from './Gate.jsx';
import './ui/styles.css';

createRoot(document.getElementById('root')).render(<Gate><App /></Gate>);
