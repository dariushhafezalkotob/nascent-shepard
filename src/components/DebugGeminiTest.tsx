
import React, { useState } from 'react';
import { AIService } from '../services/AIService';

interface DebugGeminiTestProps {
    // We'll read apiKey from local storage or ask user if needed, 
    // but for now let's just accept it as a prop or rely on the same storage the main app uses.
    // Actually, `AIService` methods take `apiKey` as arg.
    // The main Layout passes it from state.
    apiKey?: string;
}

export const DebugGeminiTest: React.FC<DebugGeminiTestProps> = () => {
    const [status, setStatus] = useState<string>('Ready');
    const [imageData, setImageData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(true);

    const TEST_PROMPT = "2 bedroom apartment floor plan. blueprint";

    const handleTest = async () => {
        if (!apiKey) {
            setError("Please enter your API Key below.");
            return;
        }

        setStatus('Generating...');
        setError(null);
        setImageData(null);

        try {
            const base64 = await AIService.generateImage(TEST_PROMPT, apiKey);
            setImageData(base64);
            setStatus('Success!');
        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setStatus('Failed');
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: 'none'
                }}
            >
                Start Debug Test
            </button>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            maxWidth: '300px',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid #333'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Gemini Image Test</h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '16px' }}
                >
                    ×
                </button>
            </div>

            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>
                Prompt: "{TEST_PROMPT}"
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input
                    type="password"
                    placeholder="Enter Gemini API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #444',
                        background: '#222',
                        color: 'white',
                        fontSize: '12px'
                    }}
                />
            </div>

            <button
                onClick={handleTest}
                disabled={status === 'Generating...'}
                style={{
                    background: status === 'Generating...' ? '#666' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                }}
            >
                {status === 'Generating...' ? 'Generating...' : 'Test Generation'}
            </button>

            {error && (
                <div style={{ color: '#ff6b6b', marginTop: '10px', fontSize: '11px', whiteSpace: 'pre-wrap', background: 'rgba(255,0,0,0.1)', padding: '5px', borderRadius: '4px' }}>
                    {error}
                </div>
            )}

            {imageData && (
                <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', marginBottom: '5px', color: '#4caf50', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Image Received!</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>2.5-flash-image</span>
                    </div>
                    <img
                        src={`data:image/png;base64,${imageData}`}
                        alt="Generated Plan"
                        style={{ width: '100%', borderRadius: '4px', border: '1px solid #555' }}
                    />
                </div>
            )}
        </div>
    );
};
