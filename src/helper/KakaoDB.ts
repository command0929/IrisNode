import axios from 'axios';

export class KakaoDB {
  private BOT_ID: string;
  private BOT_NAME: string;
  private BOT_URL: string;
  private config: any;

  constructor() {
    this.config = this.getConfig();
    this.BOT_ID = this.config["bot_id"];
    this.BOT_NAME = this.config["bot_name"];
    this.BOT_URL = this.config["bot_endpoint"];
  }

  private getConfig(): any {
    return require('../../config');
  }

  private async sendQuery(query: string, bind: any[] | null = null, endpoint: string = "/query"): Promise<any | null> {
    const url = `${this.BOT_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    const payload: any = { query };
    if (bind) payload.bind = bind;

    try {
      const response = await axios.post(url, JSON.stringify(payload), { headers });
      if (response.data.success) {
        const data = response.data.data;
        if (data === "[]" || !data) {
          return null;
        }
        return data;
      } else {
        console.error(`HTTP request failed: ${response.data.error}`);
        return null;
      }
    } catch (error) {
      console.error(`Error during HTTP request: ${error}`);
      return null;
    }
  }

  public async getColumnInfo(table: string): Promise<string[]> {
    const query = `SELECT * FROM ${table} LIMIT 1`;
    const data = await this.sendQuery(query);

    if (!data || data.length === 0) {
      return [];
    }

    try {
      const firstRow = data[0];
      if (typeof firstRow === 'object') {
        return Object.keys(firstRow);
      }
      return [];
    } catch (error) {
      console.error(`Error processing getColumnInfo: ${error}`);
      return [];
    }
  }

  public async getTableInfo(): Promise<string[]> {
    const query = "SELECT name FROM sqlite_schema WHERE type='table';";
    const data = await this.sendQuery(query);

    if (!data || data.length === 0) {
      return [];
    }

    try {
      return data.map((table: any) => table[0]);
    } catch (error) {
      console.error(`Error processing getTableInfo: ${error}`);
      return [];
    }
  }

  public async getNameOfUserId(userId: string): Promise<string | null> {
    let query: string;

    if (await this.checkNewDb()) {
      query = `
        WITH info AS (
          SELECT ? AS user_id
        )
        SELECT
          COALESCE(open_chat_member.nickname, friends.name) AS name,
          COALESCE(open_chat_member.enc, friends.enc) AS enc
        FROM info
        LEFT JOIN db2.open_chat_member
          ON open_chat_member.user_id = info.user_id
        LEFT JOIN db2.friends
          ON friends.id = info.user_id;
      `;
    } else {
      query = "SELECT name, enc FROM db2.friends WHERE id = ?";
    }

    const data = await this.sendQuery(query, [userId]);

    if (!data) {
      return null;
    }

    try {
      const row = data[0];
      const enc = row[1];
      return await this.decrypt(enc, row[0]);
    } catch (error) {
      console.error(`Error processing getNameOfUserId: ${error}`);
      return null;
    }
  }

  public async getUserInfo(chatId: string, userId: string): Promise<[string, string]> {
    const sender = userId === this.BOT_ID ? this.BOT_NAME : await this.getNameOfUserId(userId);
    const query = "SELECT name FROM db2.open_link WHERE id = (SELECT link_id FROM chat_rooms WHERE id = ?)";
    const data = await this.sendQuery(query, [chatId]);

    if (!data || data.length === 0) {
      return [sender || '', sender || ''];
    }

    try {
      return [data[0][0] || sender, sender || ''];
    } catch (error) {
      console.error(`Error processing getUserInfo: ${error}`);
      return [sender || '', sender || ''];
    }
  }

  public async getRowFromLogId(logId: string): Promise<any | null> {
    const query = "SELECT * FROM chat_logs WHERE id = ?";
    const data = await this.sendQuery(query, [logId]);

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  public async cleanChatLogs(days: number): Promise<string> {
    try {
      const now = Date.now();
      const daysBeforeNow = Math.round(now - days * 24 * 60 * 60 * 1000);
      const query = "DELETE FROM chat_logs WHERE created_at < ?";
      await this.sendQuery(query, [daysBeforeNow]);

      return `${days}일 이상 지난 데이터가 삭제되었습니다.`;
    } catch (error) {
      console.error(`Error cleaning chat logs: ${error}`);
      return "요청이 잘못되었거나 에러가 발생하였습니다.";
    }
  }

  public async logToDict(logId: string): Promise<any> {
    const query = "SELECT * FROM chat_logs WHERE id = ?";
    const data = await this.sendQuery(query, [logId]);

    if (!data || data.length === 0) {
      return {};
    }

    const rows = data;
    const descriptionsQuery = "PRAGMA table_info(chat_logs)";
    const descriptionsData = await this.sendQuery(descriptionsQuery);

    if (!descriptionsData || descriptionsData.length === 0) {
      return {};
    }

    const descriptions = descriptionsData.map((d: any) => d[1]);
    const row = rows[0];

    return descriptions.reduce((dict: any, description: string, index: number) => {
      dict[description] = row[index];
      return dict;
    }, {});
  }

  private async checkNewDb(): Promise<boolean> {
    const query = "SELECT name FROM db2.sqlite_master WHERE type='table' AND name='open_chat_member'";
    const data = await this.sendQuery(query);

    return data !== null && data.length > 0;
  }

  private async decrypt(encType: string, b64Ciphertext: string, userId: string = this.BOT_ID): Promise<string | null> {
    const decryptEndpoint = "/decrypt";
    const url = `${this.BOT_URL}${decryptEndpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    const payload = { enc: encType, b64_ciphertext: b64Ciphertext, user_id: userId };

    try {
      const response = await axios.post(url, JSON.stringify(payload), { headers });
      if (response.data.plain_text) {
        return response.data.plain_text;
      }
      console.error(`Decrypt request failed: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error) {
      console.error(`Error during decrypt request: ${error}`);
      return null;
    }
  }
}