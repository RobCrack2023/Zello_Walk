// Variables globales
let socket;
let mediaRecorder;
let audioChunks = [];
let currentUser = null;
let currentChannel = null;
let isRecording = false;
let selectedFile = null;
let availableChannels = [];
let audioContexts = new Map(); // Para manejar múltiples reproductores de audio

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const channelsScreen = document.getElementById('channels-screen');
const mainScreen = document.getElementById('main-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const pttButton = document.getElementById('ptt-button');
const messagesList = document.getElementById('messages-list');
const textInput = document.getElementById('text-input');
const sendTextBtn = document.getElementById('send-text-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const channelsModal = document.getElementById('channels-modal');
const mediaPreviewModal = document.getElementById('media-preview-modal');
const talkingIndicator = document.getElementById('talking-indicator');
const userCountElement = document.getElementById('user-count');
const currentChannelName = document.getElementById('current-channel-name');
const channelSearch = document.getElementById('channel-search');
const channelsScreenList = document.getElementById('channels-screen-list');
const backToChannelsBtn = document.getElementById('back-to-channels-btn');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkInstallation();
});

function initEventListeners() {
    // Login
    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // PTT
    pttButton.addEventListener('mousedown', startRecording);
    pttButton.addEventListener('mouseup', stopRecording);
    pttButton.addEventListener('mouseleave', stopRecording);
    pttButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRecording();
    });
    pttButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopRecording();
    });

    // Chat
    sendTextBtn.addEventListener('click', sendTextMessage);
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    });

    // Multimedia
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // Click fuera del modal
    [channelsModal, mediaPreviewModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Crear canal (modal)
    document.getElementById('create-channel-btn').addEventListener('click', createChannelFromModal);
    document.getElementById('new-channel-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createChannelFromModal();
    });

    // Enviar media
    document.getElementById('send-media-btn').addEventListener('click', sendMediaMessage);

    // Buscador de canales
    channelSearch.addEventListener('input', filterChannels);

    // Crear canal desde pantalla de canales
    document.getElementById('create-channel-btn-screen').addEventListener('click', createChannelFromScreen);
    document.getElementById('new-channel-input-screen').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createChannelFromScreen();
    });

    // Volver a canales
    backToChannelsBtn.addEventListener('click', showChannelsScreen);

    // Chat drawer
    document.getElementById('open-chat-btn').addEventListener('click', openChatDrawer);
    document.getElementById('close-chat-btn').addEventListener('click', closeChatDrawer);
    document.getElementById('channels-footer-btn').addEventListener('click', showChannelsScreen);

    // Chat tabs
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchChatTab(tabName);
        });
    });

    // Channel selector click
    document.querySelector('.zello-channel-selector')?.addEventListener('click', showChannelsScreen);
}

function handleLogin() {
    const username = usernameInput.value.trim();
    if (!username) {
        showToast('Por favor ingresa tu nombre', 'error');
        return;
    }

    currentUser = {
        username: username,
        id: null
    };

    connectToServer();
}

function connectToServer() {
    socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('Conectado al servidor');
        socket.emit('register', { username: currentUser.username });
    });

    socket.on('registered', (data) => {
        currentUser.id = data.userId;
        currentUser.username = data.username;

        loginScreen.classList.remove('active');
        showChannelsScreen();

        document.getElementById('user-greeting-name').textContent = currentUser.username;

        // Cargar canales disponibles
        loadAvailableChannels();

        showToast(`Bienvenido, ${currentUser.username}!`, 'success');
    });

    socket.on('channel-history', (data) => {
        messagesList.innerHTML = '';
        data.messages.forEach(msg => displayMessage(msg));
        scrollToBottom();
    });

    socket.on('channel-users', (data) => {
        updateUsersList(data.users);
    });

    socket.on('user-joined', (data) => {
        showToast(`${data.username} se unió al canal`, 'info');
    });

    socket.on('user-left', (data) => {
        showToast(`${data.username} salió del canal`, 'info');
    });

    socket.on('voice-message', (message) => {
        displayMessage(message);
        scrollToBottom();
    });

    socket.on('text-message', (message) => {
        displayMessage(message);
        scrollToBottom();
    });

    socket.on('media-message', (message) => {
        displayMessage(message);
        scrollToBottom();
    });

    socket.on('user-talking', (data) => {
        showTalkingIndicator(data);
    });

    socket.on('disconnect', () => {
        showToast('Desconectado del servidor', 'error');
    });

    socket.on('reconnect', () => {
        showToast('Reconectado al servidor', 'success');
        if (currentChannel) {
            joinChannel(currentChannel);
        }
    });
}

function loadAvailableChannels() {
    // Canales por defecto
    availableChannels = [
        { id: 'general', name: 'General', users: 0, icon: 'hashtag', description: 'Canal principal' },
        { id: 'tech', name: 'Tech', users: 0, icon: 'laptop-code', description: 'Tecnología' },
        { id: 'music', name: 'Music', users: 0, icon: 'music', description: 'Música' },
        { id: 'gaming', name: 'Gaming', users: 0, icon: 'gamepad', description: 'Videojuegos' },
        { id: 'random', name: 'Random', users: 0, icon: 'random', description: 'Temas diversos' }
    ];

    renderChannelsList();
}

function renderChannelsList(filter = '') {
    channelsScreenList.innerHTML = '';

    const filtered = availableChannels.filter(ch =>
        ch.name.toLowerCase().includes(filter.toLowerCase()) ||
        ch.description.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        channelsScreenList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No se encontraron canales</p>
            </div>
        `;
        return;
    }

    filtered.forEach(channel => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        if (currentChannel === channel.id) {
            card.classList.add('active');
        }

        card.innerHTML = `
            <div class="channel-card-icon">
                <i class="fas fa-${channel.icon}"></i>
            </div>
            <div class="channel-card-info">
                <div class="channel-card-name">${channel.name}</div>
                <div class="channel-card-meta">
                    <i class="fas fa-users"></i>
                    <span>${channel.users} usuario${channel.users !== 1 ? 's' : ''}</span>
                    ${channel.description ? `• ${channel.description}` : ''}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            joinChannelFromScreen(channel.id);
        });

        channelsScreenList.appendChild(card);
    });
}

function filterChannels() {
    const filter = channelSearch.value;
    renderChannelsList(filter);
}

function showChannelsScreen() {
    mainScreen.classList.remove('active');
    channelsScreen.classList.add('active');
    renderChannelsList();
}

function joinChannelFromScreen(channelId) {
    joinChannel(channelId);
    channelsScreen.classList.remove('active');
    mainScreen.classList.add('active');
}

function joinChannel(channelId) {
    currentChannel = channelId;
    socket.emit('join-channel', { channelId });

    const channel = availableChannels.find(ch => ch.id === channelId);
    currentChannelName.textContent = channel ? channel.name : channelId.charAt(0).toUpperCase() + channelId.slice(1);

    closeModal(channelsModal);
}

function createChannelFromScreen() {
    const input = document.getElementById('new-channel-input-screen');
    const channelName = input.value.trim();

    if (!channelName) {
        showToast('Ingresa un nombre para el canal', 'error');
        return;
    }

    const channelId = channelName.toLowerCase().replace(/\s+/g, '-');

    // Agregar a la lista de canales
    if (!availableChannels.find(ch => ch.id === channelId)) {
        availableChannels.push({
            id: channelId,
            name: channelName,
            users: 0,
            icon: 'comments',
            description: 'Canal personalizado'
        });
    }

    input.value = '';
    joinChannelFromScreen(channelId);
}

function createChannelFromModal() {
    const input = document.getElementById('new-channel-input');
    const channelName = input.value.trim();

    if (!channelName) {
        showToast('Ingresa un nombre para el canal', 'error');
        return;
    }

    const channelId = channelName.toLowerCase().replace(/\s+/g, '-');

    // Agregar a la lista de canales
    if (!availableChannels.find(ch => ch.id === channelId)) {
        availableChannels.push({
            id: channelId,
            name: channelName,
            users: 0,
            icon: 'comments',
            description: 'Canal personalizado'
        });
    }

    input.value = '';
    joinChannel(channelId);
}

async function startRecording() {
    if (isRecording) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64Audio = reader.result;
                socket.emit('voice-message', { audio: base64Audio });
            };

            reader.readAsDataURL(audioBlob);

            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;

        // Estilo Zello
        pttButton.classList.add('recording');
        document.querySelector('.recording-indicator')?.classList.add('active');
        document.getElementById('channel-subtitle').textContent = 'Hablando...';

        socket.emit('talking', { talking: true });

    } catch (error) {
        console.error('Error al acceder al micrófono:', error);
        showToast('No se pudo acceder al micrófono', 'error');
    }
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) return;

    mediaRecorder.stop();
    isRecording = false;

    // Estilo Zello
    pttButton.classList.remove('recording');
    document.querySelector('.recording-indicator')?.classList.remove('active');
    document.getElementById('channel-subtitle').textContent = 'Toca para hablar';

    socket.emit('talking', { talking: false });
}

function sendTextMessage() {
    const text = textInput.value.trim();
    if (!text) return;

    socket.emit('text-message', { text });
    textInput.value = '';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;

    // Mostrar preview
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = '';

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        previewContainer.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        previewContainer.appendChild(video);
    }

    openModal(mediaPreviewModal);
    fileInput.value = '';
}

async function sendMediaMessage() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
            const caption = document.getElementById('media-caption').value.trim();

            socket.emit('media-message', {
                mediaType,
                url: data.url,
                caption
            });

            closeModal(mediaPreviewModal);
            document.getElementById('media-caption').value = '';
            selectedFile = null;
            showToast('Archivo enviado', 'success');
        } else {
            showToast('Error al subir archivo', 'error');
        }
    } catch (error) {
        console.error('Error al subir archivo:', error);
        showToast('Error al subir archivo', 'error');
    }
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    if (message.userId === currentUser.id) {
        messageDiv.classList.add('own');
    }

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.username.charAt(0).toUpperCase();

    const content = document.createElement('div');
    content.className = 'message-content';

    const header = document.createElement('div');
    header.className = 'message-header';

    const username = document.createElement('span');
    username.className = 'message-username';
    username.textContent = message.username;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp);

    header.appendChild(username);
    header.appendChild(time);

    const body = document.createElement('div');
    body.className = 'message-body';

    // Diferentes tipos de mensajes
    if (message.type === 'text') {
        body.textContent = message.text;
    } else if (message.type === 'voice') {
        const voiceDiv = createVoiceMessage(message.data, message.id);
        body.appendChild(voiceDiv);
    } else if (message.type === 'image') {
        const img = document.createElement('img');
        img.src = message.url;
        img.className = 'media-message';
        img.onclick = () => window.open(message.url, '_blank');
        body.appendChild(img);

        if (message.caption) {
            const caption = document.createElement('div');
            caption.className = 'media-caption';
            caption.textContent = message.caption;
            body.appendChild(caption);
        }
    } else if (message.type === 'video') {
        const video = document.createElement('video');
        video.src = message.url;
        video.controls = true;
        video.className = 'media-message';
        body.appendChild(video);

        if (message.caption) {
            const caption = document.createElement('div');
            caption.className = 'media-caption';
            caption.textContent = message.caption;
            body.appendChild(caption);
        }
    }

    content.appendChild(header);
    content.appendChild(body);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    messagesList.appendChild(messageDiv);
}

function createVoiceMessage(audioData, messageId) {
    const voiceDiv = document.createElement('div');
    voiceDiv.className = 'voice-message';

    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';

    // Crear ecualizador
    const equalizerDiv = document.createElement('div');
    equalizerDiv.className = 'audio-equalizer';
    equalizerDiv.id = `equalizer-${messageId}`;

    // Crear 30 barras para el ecualizador
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        equalizerDiv.appendChild(bar);
    }

    const audio = new Audio(audioData);
    let audioContext = null;
    let analyser = null;
    let source = null;
    let animationId = null;

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            // Inicializar Web Audio API para análisis
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 64; // Más pequeño para mejor rendimiento
                source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContext.destination);

                audioContexts.set(messageId, { audioContext, analyser, source });
            }

            audio.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playBtn.classList.add('playing');
            equalizerDiv.classList.add('active');
            animateEqualizer(analyser, equalizerDiv);
        } else {
            audio.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.classList.remove('playing');
            equalizerDiv.classList.remove('active');
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
    });

    audio.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.classList.remove('playing');
        equalizerDiv.classList.remove('active');
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

    // Función para animar el ecualizador
    function animateEqualizer(analyser, container) {
        const bars = container.querySelectorAll('.bar');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            bars.forEach((bar, index) => {
                const dataIndex = Math.floor(index * bufferLength / bars.length);
                const value = dataArray[dataIndex];
                const height = (value / 255) * 100;
                bar.style.height = `${Math.max(10, height)}%`;
                bar.style.setProperty('--bar-height', `${height}%`);
            });
        }

        draw();
    }

    voiceDiv.appendChild(playBtn);
    voiceDiv.appendChild(equalizerDiv);

    return voiceDiv;
}

function updateUsersList(users) {
    const usersList = document.querySelector('#users-tab .users-list');
    if (!usersList) return;

    usersList.innerHTML = '';

    userCountElement.textContent = users.length;

    // Actualizar contador en la lista de canales
    const channelIndex = availableChannels.findIndex(ch => ch.id === currentChannel);
    if (channelIndex !== -1) {
        availableChannels[channelIndex].users = users.length;
    }

    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';

        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.style.background = 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))';
        avatar.textContent = user.username.charAt(0).toUpperCase();

        const name = document.createElement('span');
        name.className = 'user-name';
        name.textContent = user.username;

        userDiv.appendChild(avatar);
        userDiv.appendChild(name);
        usersList.appendChild(userDiv);
    });
}

// Chat Drawer Functions
function openChatDrawer() {
    document.getElementById('chat-drawer').classList.add('active');
}

function closeChatDrawer() {
    document.getElementById('chat-drawer').classList.remove('active');
}

function switchChatTab(tabName) {
    // Actualizar tabs
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.chat-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (tabName === 'messages') {
        document.getElementById('messages-tab').classList.add('active');
    } else if (tabName === 'users') {
        document.getElementById('users-tab').classList.add('active');
    }
}

function showTalkingIndicator(data) {
    if (data.talking) {
        const username = talkingIndicator.querySelector('.talking-username');
        username.textContent = `${data.username} está hablando`;
        talkingIndicator.classList.add('active');
    } else {
        setTimeout(() => {
            talkingIndicator.classList.remove('active');
        }, 500);
    }
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = document.createElement('i');
    if (type === 'success') icon.className = 'fas fa-check-circle';
    else if (type === 'error') icon.className = 'fas fa-exclamation-circle';
    else icon.className = 'fas fa-info-circle';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function scrollToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight;
}

function checkInstallation() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registrado'))
                .catch(err => console.error('Error al registrar SW:', err));
        });
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('App puede ser instalada');
    });
}
