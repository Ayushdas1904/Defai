// index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/api', aiRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.get("/", (req, res) => res.send("Server running"));