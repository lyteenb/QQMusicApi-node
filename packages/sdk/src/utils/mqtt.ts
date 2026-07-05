/** MQTT 5.0 over WebSocket 客户端 — 用于移动端扫码登录 */
import mqtt from "mqtt";

export interface MqttMessage {
  topic: string;
  payload: Buffer;
  qos: number;
  properties?: Record<string, unknown>;
  json?: unknown;
}

export class MqttClient {
  private client: mqtt.MqttClient | null = null;
  private messageQueue: MqttMessage[] = [];
  private resolveNext: ((value: IteratorResult<MqttMessage>) => void) | null = null;
  private connected = false;

  constructor(
    private clientId: string,
    private host: string,
    private port: number = 443,
    private path: string = "/mqtt",
    private keepAlive: number = 45,
    private maxRedirects: number = 3,
  ) {}

  async connect(properties?: Record<string, unknown>, headers?: Record<string, string>): Promise<void> {
    const url = `wss://${this.host}:${this.port}${this.path}`;

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(url, {
        clientId: this.clientId,
        protocolVersion: 5,
        keepalive: this.keepAlive,
        reconnectPeriod: 0,
        properties: properties as mqtt.IClientOptions["properties"],
        wsOptions: headers ? { headers } : undefined,
      });

      this.client.once("connect", (connack) => {
        this.connected = true;
        if (connack.reasonCode === 0) {
          resolve();
        } else if (connack.reasonCode === 0x9c || connack.reasonCode === 0x9d) {
          reject(new Error(`MQTT redirect: ${connack.reasonCode}`));
        } else {
          reject(new Error(`CONNACK rejected: ${connack.reasonCode}`));
        }
      });

      this.client.once("error", reject);

      this.client.on("message", (topic, payload, packet) => {
        const msg: MqttMessage = {
          topic,
          payload,
          qos: packet.qos,
          properties: packet.properties as Record<string, unknown>,
        };
        try { msg.json = JSON.parse(payload.toString()); } catch { /* not JSON */ }

        if (this.resolveNext) {
          this.resolveNext({ value: msg, done: false });
          this.resolveNext = null;
        } else {
          this.messageQueue.push(msg);
        }
      });
    });
  }

  async subscribe(topic: string, properties?: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, { qos: 1, properties }, (err, granted) => {
        if (err) reject(err);
        else if (granted?.some((g) => (g.qos & 0x80) !== 0)) reject(new Error("SUBACK rejected"));
        else resolve();
      });
    });
  }

  async *messages(): AsyncGenerator<MqttMessage, void, undefined> {
    while (this.connected) {
      if (this.messageQueue.length > 0) {
        yield this.messageQueue.shift()!;
      } else {
        yield await new Promise<MqttMessage>((resolve) => {
          this.resolveNext = (result) => {
            if (result.done) resolve({ topic: "", payload: Buffer.alloc(0), qos: 0 });
            else resolve(result.value);
          };
        });
      }
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    return new Promise<void>((resolve) => {
      this.client?.end(false, {}, (err?: Error) => { resolve(); });
    });
  }
}
