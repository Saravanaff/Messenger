import { useEffect, useState } from 'react';

export default function TestPage() {
    const [backendStatus, setBackendStatus] = useState('Testing...');
    const [frontendStatus, setFrontendStatus] = useState('OK');

    useEffect(() => {
        // Test backend connection
        fetch('http://localhost:5000/api/health')
            .then(res => res.json())
            .then(data => {
                setBackendStatus(`✅ Backend OK: ${JSON.stringify(data)}`);
            })
            .catch(err => {
                setBackendStatus(`❌ Backend Error: ${err.message}`);
            });
    }, []);

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace' }}>
            <h1>Connection Test</h1>
            <div style={{ marginTop: '20px' }}>
                <p><strong>Frontend:</strong> {frontendStatus}</p>
                <p><strong>Backend:</strong> {backendStatus}</p>
            </div>
            <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h3>Debug Info:</h3>
                <p>Frontend URL: {window.location.origin}</p>
                <p>Backend URL: http://localhost:5000</p>
                <p>LocalStorage Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</p>
                <p>LocalStorage User: {localStorage.getItem('user') ? '✅ Present' : '❌ Missing'}</p>
            </div>
        </div>
    );
}
