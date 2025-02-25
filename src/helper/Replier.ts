import axios from 'axios';
import fs from 'fs';
import { Buffer } from 'buffer';

export class Replier {
  private botUrl: string;
  private json: any;
  private room: string;
  private queue: Array<[string, string, string]>;
  private lastSentTime: number;

  constructor(requestData: any) {
    const config = this.getConfig();
    this.botUrl = config["bot_endpoint"] + "/reply";
    this.json = requestData["json"];
    this.room = String(this.json["chat_id"]);
    this.queue = [];
    this.lastSentTime = Date.now();
  }

  private getConfig(): any {
    return require('../../config');
  }

  private async sendHttpRequest(type: string, data: string, room: string): Promise<void> {
    const payload = {
      type,
      room,
      data
    };
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.post(this.botUrl, payload, { headers });
      console.log(`HTTP request successful for room ${room}, type ${type}`);
    } catch (error) {
      console.error(`HTTP request failed for room ${room}, type ${type}: ${error}`);
    }
  }

  public reply(msg: string, room: string | null = null): void {
    if (!room) {
      room = this.room;
    }
    this.queueMessage('text', String(msg), String(room));
  }

  public replyImageFromFile(room: string, filepath: string): void {
    fs.readFile(filepath, (err, data) => {
      if (err) {
        console.error(`Error reading image file: ${err}`);
        return;
      }
      this.replyImageFromImage(room, data);
    });
  }

  public replyImageFromImage(room: string, img: Buffer): void {
    const base64String = img.toString('base64');
    if (!room) {
      room = this.room;
    }
    this.queueMessage('image', base64String, String(room));
  }

  private queueMessage(type: string, data: string, room: string): void {
    this.queue.push([type, data, room]);
    if (this.queue.length === 1) {
      this.sendMessage();
    }
  }

  private sendMessage(): void {
    const nextMessage = this.queue[0];
    const currentTime = Date.now();
    if (currentTime - this.lastSentTime >= 100) {
      const [msgType, msgData, msgRoom] = nextMessage;
      this.sendHttpRequest(msgType, msgData, msgRoom);
      this.queue.shift();
      this.lastSentTime = currentTime;
    }
    if (this.queue.length > 0) {
      setTimeout(() => this.sendMessage(), 100);
    }
  }
}