(function() {
    // Prevent multiple initializations
    if (window.HeyGenAvatarLoaded) return;
    window.HeyGenAvatarLoaded = true;

    // Configuration
    const config = {
        heyGenApiKey: 'MmM0MTZjMjM1OTM1NDY5ODkzYzRiZWIwNjI1ODU5ZWEtMTc1MTg3MzIxMw==', // Replace with your HeyGen API key
        avatarId: 'June_HR_public', // Replace with your HeyGen avatar ID from labs.heygen.com
        streamingApiUrl: 'wss://api.heygen.com/v2/streaming', // HeyGen Streaming API endpoint
        n8nWebhookUrl: 'https://gigwave24.app.n8n.cloud/webhook/heygen', // For initial knowledge base setup
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
        .heygen-voice-container {
            margin-top: 20px;
            padding: 0 10px;
        }
        .heygen-voice-button {
            padding: 12px 24px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .heygen-voice-button:hover {
            background: #059669;
        }
        .heygen-voice-response {
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
        <video id="heygenAvatarVideo" class="heygen-avatar-video" autoplay controls></video>
        <div class="heygen-voice-container">
            <button id="startVoiceBtn" class="heygen-voice-button">Start Voice</button>
            <button id="stopVoiceBtn" class="heygen-voice-button" style="display: none;">Stop Voice</button>
            <div class="heygen-loader">
                <div class="heygen-loader-dot"></div>
                <div class="heygen-loader-dot"></div>
                <div class="heygen-loader-dot"></div>
            </div>
            <div class="heygen-voice-response"></div>
            <div class="heygen-timestamp"></div>
        </div>
    `;
    document.body.appendChild(container);

    // DOM elements
    const videoElement = container.querySelector('#heygenAvatarVideo');
    const startVoiceBtn = container.querySelector('#startVoiceBtn');
    const stopVoiceBtn = container.querySelector('#stopVoiceBtn');
    const loader = container.querySelector('.heygen-loader');
    const responseDiv = container.querySelector('.heygen-voice-response');
    const timestampDiv = container.querySelector('.heygen-timestamp');

    // Update timestamp with current date and time
    function updateTimestamp() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        const day = now.toLocaleDateString('en-US', { weekday: 'long' });
        const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        timestampDiv.textContent = `${hours}:${minutes} ${ampm} ${day}, ${date} +08`; // 05:03 PM Wednesday, Jul 16, 2025 +08
    }
    updateTimestamp();
    setInterval(updateTimestamp, 60000); // Update every minute

    // Initialize MediaSource for video
    const mediaSource = new MediaSource();
    videoElement.src = URL.createObjectURL(mediaSource);
    let sourceBuffer;

    mediaSource.addEventListener('sourceopen', () => {
        sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"'); // Assuming H.264, adjust codec as needed
        sourceBuffer.mode = 'sequence';
    });

    // Audio context for input and output
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: config.sampleRate });
    let mediaStreamSource, scriptProcessor, ws;

    // Initialize WebSocket for HeyGen Streaming API
    function initializeWebSocket() {
        ws = new WebSocket(config.streamingApiUrl);
        ws.binaryType = 'arraybuffer'; // Handle binary audio and video frames
        ws.onopen = () => {
            console.log('WebSocket connected');
            const initPayload = {
                api_key: config.heyGenApiKey,
                avatar_id: config.avatarId,
                session_id: config.sessionId,
                user_id: config.userId,
                knowledge_base: config.defaultKnowledgeBase,
                mode: 'streaming',
                sample_rate: config.sampleRate
            };
            ws.send(JSON.stringify(initPayload));
        };
        ws.onmessage = (event) => {
            const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : JSON.parse(event.data);
            if (data instanceof Uint8Array && data.length > 0) {
                // Assume binary data is video or audio frame
                if (data[0] === 0x00) { // Hypothetical video frame identifier
                    if (!sourceBuffer || mediaSource.readyState !== 'open') return;
                    try {
                        if (sourceBuffer.updating) {
                            sourceBuffer.addEventListener('updateend', () => {
                                sourceBuffer.appendBuffer(data);
                            });
                        } else {
                            sourceBuffer.appendBuffer(data);
                        }
                    } catch (e) {
                        console.error('Error appending video frame:', e);
                    }
                } else if (data[0] === 0x01) { // Hypothetical audio frame identifier
                    const audioBuffer = audioContext.createBuffer(1, data.length / 2, config.sampleRate); // Assuming 16-bit PCM
                    audioBuffer.copyToChannel(new Int16Array(data.buffer), 0);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.start();
                }
            } else if (typeof data === 'object' && data.type === 'text_response') {
                responseDiv.textContent = data.text;
                loader.classList.remove('active');
                updateTimestamp();
            }
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(initializeWebSocket, 1000); // Reconnect after 1 second
        };
    }

    // Start voice recording
    async function startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            mediaStreamSource.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            scriptProcessor.onaudioprocess = (e) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    const input = e.inputBuffer.getChannelData(0);
                    const rawData = new Int16Array(input.length);
                    for (let i = 0; i < input.length; i++) {
                        rawData[i] = input[i] * 32767; // Convert to 16-bit
                    }
                    ws.send(rawData.buffer);
                }
            };

            startVoiceBtn.style.display = 'none';
            stopVoiceBtn.style.display = 'inline-block';
            loader.classList.add('active');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            responseDiv.textContent = 'Error: Microphone access denied.';
            loader.classList.remove('active');
        }
    }

    // Stop voice recording
    function stopVoiceRecording() {
        if (mediaStreamSource) mediaStreamSource.disconnect();
        if (scriptProcessor) scriptProcessor.disconnect();
        startVoiceBtn.style.display = 'inline-block';
        stopVoiceBtn.style.display = 'none';
        loader.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'end_speech', session_id: config.sessionId }));
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
    startVoiceBtn.addEventListener('click', startVoiceRecording);
    stopVoiceBtn.addEventListener('click', stopVoiceRecording);

    // Initialize avatar and knowledge base
    initializeKnowledgeBase();
    initializeWebSocket();
})();