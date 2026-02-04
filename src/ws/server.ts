import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

const matchSubscribers: Map<number, Set<WebSocket>> = new Map();

function subscribe(matchId: number, socket: WebSocket) {
    if(!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    const subscribers = matchSubscribers.get(matchId);
    subscribers?.add(socket);
} 

function unsubscribe(matchId: number, socket: WebSocket) {
    const subscribers = matchSubscribers.get(matchId);

    if(!subscribers) return;

    subscribers.delete(socket);

    if(subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket: WebSocket) {
    for (const matchId of socket?.subscriptions || []) {
        unsubscribe(matchId, socket);
    }
}

function sendJSON(socket: WebSocket, payload: any) {
    if(socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss: WebSocketServer, payload: any) {
    for (const client of wss.clients) {
        if(client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchId: number, payload: any) {
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for(const client of subscribers) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function handleMessage(socket: WebSocket, data: any) {
    let message;

    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        sendJSON(socket, {type: "error", error: "Invalid Payload."});
    }

    if(message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions = socket.subscriptions || new Set();
        socket.subscriptions.add(message.matchId);
        sendJSON(socket, {type: "subscribed", matchId: message.matchId});
    }

    if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions = socket.subscriptions || new Set();
        socket.subscriptions.delete(message.matchId);
        sendJSON(socket, {type: "unsubscribed", matchId: message.matchId});
    }
}

export function attachWebsocketServer(server: Server) {
    const wss = new WebSocketServer({server, path: '/ws', maxPayload: 1024 * 1024});

    wss.on("connection", (socket: WebSocket) => {

        socket.isAlive = true; 
        
        socket.on("pong", () => {
            socket.isAlive = true;
        })
        
        socket.subscriptions = new Set();

        sendJSON(socket, {type: "welcome"});

        socket.on("message", (data) => handleMessage(socket, data));

        socket.on("close", () => {
            cleanupSubscriptions(socket);
        });

        socket.on("error", (error) => {
            socket.terminate();
        });

        socket.on("error", console.error)

    })

    const interval = setInterval(() => {
        wss.clients.forEach((socket: WebSocket) => {
            if(socket.isAlive === false) {
                return socket.terminate();
            }
            
            socket.isAlive = false;
            socket.ping();
        }
        )
    }, 30000);
    
    wss.on("close", () => {
        clearInterval(interval);
    });

    function broadcastMatchCreated(match: any) {
        broadcastToAll(wss, {type: "match_created", data: match});
    }
    
    function broadcastCommentary(matchId: number, comment: any) {
        broadcastToMatch(matchId, {type: "commentary", data: comment});
    }

    return {broadcastMatchCreated, broadcastCommentary}
}