import express from 'express';
import { matchesRouter } from './routes/matches';
import http from "http"; 
import { attachWebsocketServer } from './ws/server';
import { commentaryRouter } from './routes/commentary';

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

const server = http.createServer(app);


app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.use(express.json());

app.use('/matches', matchesRouter);
app.use('/matches/:id/commentary', commentaryRouter);

const {broadcastMatchCreated} = attachWebsocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
    const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running on ${baseUrl}`);
    console.log(`WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`);
})