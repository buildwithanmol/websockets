import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

function sendJSON(socket: WebSocket, payload: any) {
    if(socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcast(wss: WebSocketServer, payload: any) {
    for (const client of wss.clients) {
        if(client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
    }
}

export function attachWebsocketServer(server: Server) {
    const wss = new WebSocketServer({server, path: '/ws', maxPayload: 1024 * 1024});

    wss.on("connection", (socket: WebSocket) => {

        sendJSON(socket, {type: "welcome"})

        socket.on("error", console.error)

    })

    // Helper functions 

    function broadcastMatchCreated(match: any) {
        broadcast(wss, {type: "match_created", data: match});
    }

    return {broadcastMatchCreated}
}