(function() {
    // Prevent multiple initializations
    if (window.HeyGenAvatarLoaded) return;
    window.HeyGenAvatarLoaded = true;

    // Configuration
    const config = {
        heyGenApiKey: 'MmM0MTZjMjM1OTM1NDY5ODkzYzRiZWIwNjI1ODU5ZWEtMTc1MTg3MzIxMw==', // Replace with your HeyGen API key
        avatarId: 'June_HR_public', // Replace with your HeyGen avatar ID from labs.heygen.com
        streamingApiUrl: 'wss://api.heygen.com/v2/streaming', // HeyGen Streaming API endpoint
        n8nWebhookUrl: 'https://gigwave24.app.n8n.cloud/webhook/c6eb7543-544e-4f61-83db-8ee944e3c457/chat', // For initial knowledge base setup
        defaultKnowledgeBase: 'Hello! I can answer your questions in real-time. Ask me anything!', // Default prompt
        userId: 'guest_' + Math.random().toString(36).substr(2, 9), // Unique user ID
        sessionId: crypto.randomUUID()
    };
    
    // Load styles
    const styles = document.createElement('style');
    styles.textContent = `
        .heygen-avatar-container {
            max-width: 800px;
            margin: 20px auto;
            font-family: 'Poppins', sans-serif;
            text-align: center;
        }
        .heygen-avatar-video {
            width: 100%;
            max-height: 450px;
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
            background: #f5f5f5;
        }
        .heygen-chat-container {
            margin-top: 20px;
            padding: 0 10px;
        }
        .heygen-chat-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            resize: none;
            min-height: 50px;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .heygen-chat-input:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        .heygen-chat-button {
            margin-top: 10px;
            padding: 12px 24px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .heygen-chat-button:hover {
            background: #059669;
        }
        .heygen-chat-response {
            margin-top: 15px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
            font-size: 14px;
            text-align: left;
            min-height: 40px;
        }
        .heygen-timestamp {
            font-size: 12px;
            color: #6b7280;
            text-align: right;
            margin-top: 5px;
        }
        .heygen-loader {
            display: none;
            gap: 4px;
            margin-top: 10px;
            justify-content: center;
        }
        .heygen-loader.active {
            display: flex;
        }
        .heygen-loader-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: loaderAnimation 1.4s infinite ease-in-out;
        }
        .heygen-loader-dot:nth-child(1) { animation-delay: 0s; }
        .heygen-loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .heygen-loader-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes loaderAnimation {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
        }
        @media (max-width: 600px) {
            .heygen-avatar-container {
                margin: 10px;
                max-width: 100%;
            }
            .heygen-avatar-video {
                max-height: 300px;
            }
        }
    `;
    document.head.appendChild(styles);

    // Load Poppins font
    const fontElement = document.createElement('link');
    fontElement.rel = 'stylesheet';
    fontElement.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontElement);

    // Create avatar container
    const container = document.createElement('div');
    container.className = 'heygen-avatar-container';
    container.innerHTML = `
        <video id="heygenAvatarVideo" class="heygen-avatar-video" autoplay muted playsinline></video>
        <div class="heygen-chat-container">
            <textarea class="heygen-chat-input" placeholder="Type your question..."></textarea>
            <button class="heygen-chat-button">Send</button>
            <div class="heygen-loader">
                <div class="heygen-loader-dot"></div>
                <div class="heygen-loader-dot"></div>
                <div class="heygen-loader-dot"></div>
            </div>
            <div class="heygen-chat-response"></div>
            <div class="heygen-timestamp"></div>
        </div>
    `;
    document.body.appendChild(container);

    // DOM elements
    const videoElement = container.querySelector('#heygenAvatarVideo');
    const chatInput = container.querySelector('.heygen-chat-input');
    const sendButton = container.querySelector('.heygen-chat-button');
    const loader = container.querySelector('.heygen-loader');
    const responseDiv = container.querySelector('.heygen-chat-response');
    const timestampDiv = container.querySelector('.heygen-timestamp');

    // Update timestamp with current date and time
    function updateTimestamp() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        const day = now.toLocaleDateString('en-US', { weekday: 'long' });
        const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        timestampDiv.textContent = `${hours}:${minutes} ${ampm} ${day}, ${date} +08`; // 04:41 PM Tuesday, Jul 15, 2025 +08
    }
    updateTimestamp();
    setInterval(updateTimestamp, 60000); // Update every minute

    // Initialize WebSocket for HeyGen Streaming API
    let ws;
    function initializeWebSocket() {
        ws = new WebSocket(config.streamingApiUrl);
        ws.onopen = () => {
            console.log('WebSocket connected');
            const initPayload = {
                api_key: config.heyGenApiKey,
                avatar_id: config.avatarId,
                session_id: config.sessionId,
                user_id: config.userId,
                knowledge_base: config.defaultKnowledgeBase,
                mode: 'streaming' // Request real-time streaming mode
            };
            ws.send(JSON.stringify(initPayload));
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'video_frame') {
                videoElement.srcObject = data.video_stream;
            } else if (data.type === 'audio_frame') {
                // Handle audio if supported (e.g., play via AudioContext)
                console.log('Audio frame received:', data.audio_stream);
            } else if (data.type === 'text_response') {
                responseDiv.textContent = data.text;
                loader.classList.remove('active');
                updateTimestamp(); // Update timestamp on new response
            }
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(initializeWebSocket, 1000); // Reconnect after 1 second
        };
    }

    // Send message to HeyGen Streaming API in real-time
    function sendRealTimeMessage(text) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            loader.classList.add('active');
            responseDiv.textContent = '';
            const messagePayload = {
                type: 'user_message',
                session_id: config.sessionId,
                user_id: config.userId,
                text: text
            };
            ws.send(JSON.stringify(messagePayload));
        } else {
            console.error('WebSocket not connected');
            responseDiv.textContent = 'Error: Connection lost. Reconnecting...';
            loader.classList.remove('active');
        }
    }

    // Initialize knowledge base via n8n (one-time setup)
    async function initializeKnowledgeBase() {
        const payload = {
            action: 'initializeKnowledge',
            sessionId: config.sessionId,
            route: 'heygen-knowledge',
            knowledgeBase: config.defaultKnowledgeBase,
            metadata: { userId: config.userId, avatarId: config.avatarId }
        };
        try {
            const response = await fetch(config.n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('n8n initialization failed');
            console.log('Knowledge base initialized:', await response.json());
        } catch (error) {
            console.error('Knowledge base initialization error:', error);
        }
    }

    // Event listeners
    sendButton.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
            sendRealTimeMessage(text);
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const text = chatInput.value.trim();
            if (text) {
                sendRealTimeMessage(text);
                chatInput.value = '';
            }
        }
    });

    // Initialize avatar and knowledge base
    initializeKnowledgeBase();
    initializeWebSocket();
})();