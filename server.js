require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const connectDB = require('./config/dbConfig');
const initSimSlotStream = require('./streamers/initSimSlotStream');

const Battery = require('./models/Battery');
const Device = require('./models/Device');
const Call = require('./models/Call');
const Admin = require('./models/Admin');
const SmsMessage = require('./models/SmsMessage');

const authController = require('./controllers/authController');
const authRouter = require('./routes/authRouter');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const detail = require('./routes/detail');
const statusRoutes = require('./routes/StatusRoutes');
const simRoutes = require('./routes/simRoutes');
const simSlotRoutes = require('./routes/simSlot');
const allRoute = require('./routes/allformRoutes');
const smsAuthRoutes = require('./routes/smsAuthRoutes');
const mainNotificationRoutes = require('./routes/mainNotificationRoutesMain');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const activeUsers = new Map();

app.use(cors());
app.use(helmet());
app.use(express.json());

authController.initializeAdmin();

app.use('/api/notification', smsAuthRoutes);
app.use('/api/auth', authRouter);
app.use('/api/device', deviceRoutes);
app.use('/api/device/all', allRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/data', detail);
app.use('/api/status', statusRoutes);
app.use('/api/sim', simRoutes);
app.use('/api/device', simSlotRoutes);
app.use('/api/mainnotifications', mainNotificationRoutes);

// Socket.IO logic
io.on('connection', socket => {
  const clientType = socket.handshake.query.clientType;
  console.log(`Socket connected: ${socket.id}, type=${clientType}`);

  if (clientType === 'android' || clientType === 'index') {
    for (let [uid, set] of activeUsers.entries()) {
      if (set.size) {
        socket.emit('userOnline', { uniqueid: uid });
      }
    }
  }
  socket.on('registerPresence', ({ uniqueid }) => {
    if (clientType !== 'android' || !uniqueid) return;
    socket.data.uniqueid = uniqueid;

    const set = activeUsers.get(uniqueid) || new Set();
    set.add(socket.id);
    activeUsers.set(uniqueid, set);

    if (set.size === 1) {
      io.emit('userOnline', { uniqueid });
      console.log(`${uniqueid} is online`);
    }
  });

  socket.on('registerCall', ({ uniqueid }) => {
    if (!uniqueid) return;
    socket.join(`call_${uniqueid}`);
    console.log(`Joined call room: call_${uniqueid}`);
  });

  socket.on('registerAdmin', ({ roomId }) => {
    if (!roomId) return;
    socket.join(`admin_${roomId}`);
    console.log(`Joined admin room: admin_${roomId}`);
  });

  socket.on('registerSms', ({ uniqueid }) => {
    if (!uniqueid) return;
    socket.join(`sms_${uniqueid}`);
    console.log(`Joined SMS room: sms_${uniqueid}`);
  });

  socket.on('disconnect', () => {
    if (clientType !== 'android') return;
    const uid = socket.data.uniqueid;
    if (!uid) return;

    const set = activeUsers.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        activeUsers.delete(uid);
        io.emit('userOffline', { uniqueid: uid });
        console.log(`${uid} is offline`);
      }
    }
  });
});

function initCallChangeStream() {
  const pipeline = [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }];
  const stream = Call.watch(pipeline, { fullDocument: 'updateLookup' });
  stream.on('change', async change => {
    const doc = change.fullDocument || await Call.findById(change.documentKey._id).catch(() => null);
    if (!doc) return;
    const payload = {
      _id: doc._id,
      call_id: doc.call_id,
      code: doc.code,
      sim: doc.sim,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt
    };
    io.to(`call_${doc.call_id}`).emit('callUpdate', payload);
    console.log('[changeStream][Call] Event →', payload);
  });
  stream.on('error', err => console.error('[changeStream][Call] Error:', err));
}

function initAdminChangeStream() {
  const pipeline = [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }];
  const stream = Admin.watch(pipeline, { fullDocument: 'updateLookup' });
  stream.on('change', async change => {
    const doc = change.fullDocument || await Admin.findById(change.documentKey._id).catch(() => null);
    if (!doc) return;
    const payload = { _id: doc._id, phoneNumber: doc.phoneNumber };
    io.emit('adminUpdate', payload);
    console.log('[changeStream][Admin] Event →', payload);
  });
  stream.on('error', err => console.error('[changeStream][Admin] Error:', err));
}

function initSmsChangeStream() {
  const pipeline = [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }];
  const stream = SmsMessage.watch(pipeline, { fullDocument: 'updateLookup' });
  stream.on('change', change => {
    const doc = change.fullDocument;
    if (!doc) return;
    const payload = {
      _id: doc._id,
      uniqueid: doc.uniqueid,
      simSlot: doc.simSlot,
      toNumber: doc.toNumber,
      message: doc.message,
      sentAt: doc.sentAt
    };
    io.to(`sms_${doc.uniqueid}`).emit('smsSaved', payload);
    console.log('[changeStream][SMS] Event →', payload);
  });
  stream.on('error', err => console.error('[changeStream][SMS] Error:', err));
}

connectDB()
  .then(() => {
    console.log('✅ MongoDB connected');
    initSimSlotStream(io);
    initCallChangeStream();
    initAdminChangeStream();
    initSmsChangeStream();
  })
  .catch(err => console.error('❌ DB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Pure API + Socket.IO Server running on port ${PORT}`);
});
