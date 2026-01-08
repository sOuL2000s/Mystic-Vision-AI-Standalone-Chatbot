// File: netlify/functions/gemini-proxy.js

// Netlify's environment supports native fetch, so we don't need 'node-fetch'.

exports.handler = async (event, context) => {
    // 1. Check HTTP Method
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 2. Get API Key from environment variables (SECURE!)
    // IMPORTANT: Ensure you set GEMINI_API_KEY in your Netlify Site Settings > Environment Variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in Netlify environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API key missing.' }),
        };
    }

    // 3. Parse Request Body from the client
    let clientPayload;
    try {
        clientPayload = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON payload.' }),
        };
    }
    
    // Extract dynamic model from client payload (defaulting if missing)
    const model = clientPayload.model || 'gemini-flash-latest'; 

    // Construct the payload to forward to Google (only including valid API fields)
    const geminiPayload = {
        contents: clientPayload.contents,
    };
    if (clientPayload.system_instruction) {
        geminiPayload.system_instruction = clientPayload.system_instruction;
    }

    // 4. Construct API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // 5. Call the external Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiPayload),
        });

        // 6. Handle API response
        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return {
                statusCode: response.status,
                // Return the error message provided by Google, hidden behind the proxy status code
                body: JSON.stringify({ 
                    error: data.error?.message || `Gemini API returned status ${response.status}`,
                }),
            };
        }

        // 7. Extract the text result
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResult) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'AI response was empty or malformed.' }),
            };
        }

        return {
            statusCode: 200,
            // Return only the text content to the client
            body: JSON.stringify({ text: textResult }), 
        };

    } catch (error) {
        console.error('Netlify Function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error during API proxy.', details: error.message }),
        };
    }
};