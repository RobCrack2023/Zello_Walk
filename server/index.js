const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 10e6 // 10MB para audio/video
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|ogg|wav|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Almacenamiento en memoria de usuarios y canales
const users = new Map();
const channels = new Map();

// Crear canal por defecto
channels.set('general', {
  id: 'general',
  name: 'General',
  users: new Set(),
  messages: []
});

// Rutas API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels', (req, res) => {
  const channelList = Array.from(channels.values()).map(ch => ({
    id: ch.id,
    name: ch.name,
    userCount: ch.users.size
  }));
  res.json(channelList);
});

// Socket.IO eventos
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Registro de usuario
  socket.on('register', (data) => {
    const { username } = data;
    users.set(socket.id, {
      id: socket.id,
      username: username || `User_${socket.id.substr(0, 4)}`,
      currentChannel: null
    });

    socket.emit('registered', {
      userId: socket.id,
      username: users.get(socket.id).username
    });
  });

  // Unirse a un canal
  socket.on('join-channel', (data) => {
    const { channelId } = data;
    const user = users.get(socket.id);

    if (!user) return;

    // Salir del canal anterior
    if (user.currentChannel) {
      const oldChannel = channels.get(user.currentChannel);
      if (oldChannel) {
        oldChannel.users.delete(socket.id);
        socket.leave(user.currentChannel);
        io.to(user.currentChannel).emit('user-left', {
          userId: socket.id,
          username: user.username
        });
      }
    }

    // Unirse al nuevo canal
    let channel = channels.get(channelId);
    if (!channel) {
      channel = {
        id: channelId,
        name: channelId,
        users: new Set(),
        messages: []
      };
      channels.set(channelId, channel);
    }

    channel.users.add(socket.id);
    user.currentChannel = channelId;
    socket.join(channelId);

    // Notificar a otros usuarios
    socket.to(channelId).emit('user-joined', {
      userId: socket.id,
      username: user.username
    });

    // Enviar historial de mensajes
    socket.emit('channel-history', {
      channelId,
      messages: channel.messages.slice(-50) // Últimos 50 mensajes
    });

    // Enviar lista de usuarios en el canal
    const channelUsers = Array.from(channel.users).map(uid => ({
      id: uid,
      username: users.get(uid)?.username || 'Unknown'
    }));

    io.to(channelId).emit('channel-users', {
      channelId,
      users: channelUsers
    });
  });

  // Mensaje de voz (PTT)
  socket.on('voice-message', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.currentChannel) return;

    const channel = channels.get(user.currentChannel);
    if (!channel) return;

    const message = {
      id: Date.now() + '-' + socket.id,
      type: 'voice',
      userId: socket.id,
      username: user.username,
      data: data.audio,
      timestamp: new Date().toISOString()
    };

    channel.messages.push(message);

    // Retransmitir a todos en el canal
    io.to(user.currentChannel).emit('voice-message', message);
  });

  // Mensaje de texto
  socket.on('text-message', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.currentChannel) return;

    const channel = channels.get(user.currentChannel);
    if (!channel) return;

    const message = {
      id: Date.now() + '-' + socket.id,
      type: 'text',
      userId: socket.id,
      username: user.username,
      text: data.text,
      timestamp: new Date().toISOString()
    };

    channel.messages.push(message);
    io.to(user.currentChannel).emit('text-message', message);
  });

  // Mensaje multimedia (imagen/video)
  socket.on('media-message', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.currentChannel) return;

    const channel = channels.get(user.currentChannel);
    if (!channel) return;

    const message = {
      id: Date.now() + '-' + socket.id,
      type: data.mediaType, // 'image' o 'video'
      userId: socket.id,
      username: user.username,
      url: data.url,
      caption: data.caption || '',
      timestamp: new Date().toISOString()
    };

    channel.messages.push(message);
    io.to(user.currentChannel).emit('media-message', message);
  });

  // Usuario está hablando (indicador visual)
  socket.on('talking', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.currentChannel) return;

    socket.to(user.currentChannel).emit('user-talking', {
      userId: socket.id,
      username: user.username,
      talking: data.talking
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    const user = users.get(socket.id);

    if (user && user.currentChannel) {
      const channel = channels.get(user.currentChannel);
      if (channel) {
        channel.users.delete(socket.id);
        socket.to(user.currentChannel).emit('user-left', {
          userId: socket.id,
          username: user.username
        });
      }
    }

    users.delete(socket.id);
    console.log('Usuario desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 WebSocket listo para conexiones`);
});
