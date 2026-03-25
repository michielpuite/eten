import React from 'react';

export default function App() {
  console.log("De app is opgestart!"); 
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      backgroundColor: '#f0f4f8',
      fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '3rem' }}>🚀 Nessies Menu</h1>
      <p style={{ fontSize: '1.2rem', color: '#64748b' }}>
        Als je dit ziet, werkt de verbinding met Vercel en je domein!
      </p>
      <div style={{ marginTop: '20px', padding: '10px', background: 'white', borderRadius: '8px', shadow: 'sm' }}>
        Stap 1: Check ✅
      </div>
    </div>
  );
}
