import "ws";

declare module "ws" {
  interface WebSocket {
    isAlive?: boolean;
    subscriptions?: Set<number>;
  }
}
