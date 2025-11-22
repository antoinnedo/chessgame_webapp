import path from 'path';
import http from 'http';
import { ServerSocket } from './socket';
import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import OpenAI from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temp storage
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Server Handling */
const httpServer = http.createServer(app);

/** Start Socket */
new ServerSocket(httpServer);

/** Log the request */
app.use((req, res, next) => {
    console.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

    res.on('finish', () => {
        console.info(`METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
    });

    next();
});

/** Parse the body of the request */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/** CORS Configuration */
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    // Add your production URL here later
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
}));

/** Rules of our API */
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//
//     if (req.method == 'OPTIONS') {
//         res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
//         return res.status(200).json({});
//     }
//
//     next();
// });

/** VOICE TRANSCRIPTION API */
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

app.post('/api/transcribe', upload.single('audio'), async (req: MulterRequest, res: Response): Promise<any> => {
    try {
        console.log("---------------------------------");
        console.log("Request received at /api/transcribe");

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // 1. FIX: Determine the correct extension
        // We grab the extension from the original name sent by the frontend (e.g. "recording.mp4")
        const originalName = req.file.originalname;
        const extension = path.extname(originalName); // e.g. ".webm" or ".mp4"

        // 2. FIX: Rename the file on disk so it has that extension
        // OpenAI needs "uploads/randomhash.webm", not just "uploads/randomhash"
        const newPath = req.file.path + extension;
        fs.renameSync(req.file.path, newPath);

        console.log('Processing file:', newPath);

        // 3. Send the RENAMED file to OpenAI
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(newPath),
            model: 'whisper-1',
            prompt: "Chess game. Standard algebraic notation. Knight to f3. e4. Queen takes pawn. Castling.",
            language: "en",
        });

        // 4. Cleanup the NEW path
        fs.unlinkSync(newPath);

        console.log("Transcribed:", response.text);
        return res.json({ text: response.text });

    } catch (error: any) { // typed as any to catch OpenAI errors
        console.error("Whisper Error:", error.response ? error.response.data : error);

        // Cleanup: Check if the original OR the new file exists and delete it
        if (req.file) {
            const originalPath = req.file.path;
            const newPath = req.file.path + path.extname(req.file.originalname);

            if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
            if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
        }
        return res.status(500).json({ error: 'Transcription failed' });
    }
});

/** Healthcheck */
app.get('/ping', (req, res, next) => {
    return res.status(200).json({ hello: 'world!' });
});

/** Socket Information */
// app.get('/status', (req, res, next) => {
//     return res.status(200).json({ users: ServerSocket.instance.rooms });
// });

/** Error handling */
app.use((req, res, next) => {
    const error = new Error('Not found');

    res.status(404).json({
        message: error.message
    });
});

/** Listen */
const port = process.env.PORT || 4800;
httpServer.listen(port, () => console.info(`Server is running at port ${port}`));
