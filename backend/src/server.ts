// import express, { Request, Response } from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import OpenAI from 'openai';
// import cors from 'cors';
// import dotenv from 'dotenv';
//
// dotenv.config();
//
// const app = express();
// const upload = multer({ dest: 'uploads/' }); // Temp storage
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
// const allowedOrigins = [
//   'http://localhost:5173',
//   // 'https://your-chess-app.netlify.app'
// ];
//
// // 2. Configure CORS options
// const corsOptions: cors.CorsOptions = {
//   origin: (origin, callback) => {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
//
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       // If the origin is in our list, allow it
//       callback(null, true);
//     } else {
//       // Otherwise, block it
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['POST'], // We only need POST for the voice endpoint
// };
//
// app.use(cors(corsOptions));
// app.use(express.json());
//
// // Define a specific type for the request to ensure TS knows about the file
// interface MulterRequest extends Request {
//   file?: Express.Multer.File;
// }
//
// app.post('/api/transcribe', upload.single('audio'), async (req: MulterRequest, res: Response): Promise<any> => {
//   try {
//     console.log("---------------------------------");
//     console.log("Request received at /api/transcribe");
//     // Type Guard: Ensure file exists
//     if (!req.file) {
//       return res.status(400).json({ error: 'No audio file provided' });
//     }
//
//     console.log('Processing file:', req.file.path);
//
//     // 1. Send to OpenAI Whisper
//     const response = await openai.audio.transcriptions.create({
//       file: fs.createReadStream(req.file.path),
//       model: 'whisper-1',
//       // Priming the model for Chess context
//       prompt: "Chess game. Standard algebraic notation. Knight to f3. e4. Queen takes pawn. Castling.",
//       language: "en",
//     });
//
//     // 2. Clean up temp file
//     fs.unlinkSync(req.file.path);
//
//     // 3. Return text
//     console.log("Transcribed:", response.text);
//     return res.json({ text: response.text });
//
//   } catch (error) {
//     console.error("Whisper Error:", error);
//     // Clean up file even if error occurs to prevent disk clutter
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     return res.status(500).json({ error: 'Transcription failed' });
//   }
// });
//
// const PORT = process.env.PORT || 4800;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
