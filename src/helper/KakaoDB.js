"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KakaoDB = void 0;
const axios_1 = __importDefault(require("axios"));
class KakaoDB {
    constructor() {
        this.config = this.getConfig();
        this.BOT_ID = this.config["bot_id"];
        this.BOT_NAME = this.config["bot_name"];
        this.BOT_URL = this.config["bot_endpoint"];
    }
    getConfig() {
        return require('../../config');
    }
    sendQuery(query, bind = null, endpoint = "/query") {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.BOT_URL}${endpoint}`;
            const headers = { 'Content-Type': 'application/json' };
            const payload = { query };
            if (bind)
                payload.bind = bind;
            try {
                const response = yield axios_1.default.post(url, JSON.stringify(payload), { headers });
                if (response.data.success) {
                    const data = response.data.data;
                    if (data === "[]" || !data) {
                        return null;
                    }
                    return data;
                }
                else {
                    console.error(`HTTP request failed: ${response.data.error}`);
                    return null;
                }
            }
            catch (error) {
                console.error(`Error during HTTP request: ${error}`);
                return null;
            }
        });
    }
    getColumnInfo(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT * FROM ${table} LIMIT 1`;
            const data = yield this.sendQuery(query);
            if (!data || data.length === 0) {
                return [];
            }
            try {
                const firstRow = data[0];
                if (typeof firstRow === 'object') {
                    return Object.keys(firstRow);
                }
                return [];
            }
            catch (error) {
                console.error(`Error processing getColumnInfo: ${error}`);
                return [];
            }
        });
    }
    getTableInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = "SELECT name FROM sqlite_schema WHERE type='table';";
            const data = yield this.sendQuery(query);
            if (!data || data.length === 0) {
                return [];
            }
            try {
                return data.map((table) => table[0]);
            }
            catch (error) {
                console.error(`Error processing getTableInfo: ${error}`);
                return [];
            }
        });
    }
    getNameOfUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query;
            if (yield this.checkNewDb()) {
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
            }
            else {
                query = "SELECT name, enc FROM db2.friends WHERE id = ?";
            }
            const data = yield this.sendQuery(query, [userId]);
            if (!data) {
                return null;
            }
            try {
                const row = data[0];
                const enc = row[1];
                return yield this.decrypt(enc, row[0]);
            }
            catch (error) {
                console.error(`Error processing getNameOfUserId: ${error}`);
                return null;
            }
        });
    }
    getUserInfo(chatId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sender = userId === this.BOT_ID ? this.BOT_NAME : yield this.getNameOfUserId(userId);
            const query = "SELECT name FROM db2.open_link WHERE id = (SELECT link_id FROM chat_rooms WHERE id = ?)";
            const data = yield this.sendQuery(query, [chatId]);
            if (!data || data.length === 0) {
                return [sender || '', sender || ''];
            }
            try {
                return [data[0][0] || sender, sender || ''];
            }
            catch (error) {
                console.error(`Error processing getUserInfo: ${error}`);
                return [sender || '', sender || ''];
            }
        });
    }
    getRowFromLogId(logId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = "SELECT * FROM chat_logs WHERE id = ?";
            const data = yield this.sendQuery(query, [logId]);
            if (!data || data.length === 0) {
                return null;
            }
            return data[0];
        });
    }
    cleanChatLogs(days) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = Date.now();
                const daysBeforeNow = Math.round(now - days * 24 * 60 * 60 * 1000);
                const query = "DELETE FROM chat_logs WHERE created_at < ?";
                yield this.sendQuery(query, [daysBeforeNow]);
                return `${days}일 이상 지난 데이터가 삭제되었습니다.`;
            }
            catch (error) {
                console.error(`Error cleaning chat logs: ${error}`);
                return "요청이 잘못되었거나 에러가 발생하였습니다.";
            }
        });
    }
    logToDict(logId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = "SELECT * FROM chat_logs WHERE id = ?";
            const data = yield this.sendQuery(query, [logId]);
            if (!data || data.length === 0) {
                return {};
            }
            const rows = data;
            const descriptionsQuery = "PRAGMA table_info(chat_logs)";
            const descriptionsData = yield this.sendQuery(descriptionsQuery);
            if (!descriptionsData || descriptionsData.length === 0) {
                return {};
            }
            const descriptions = descriptionsData.map((d) => d[1]);
            const row = rows[0];
            return descriptions.reduce((dict, description, index) => {
                dict[description] = row[index];
                return dict;
            }, {});
        });
    }
    checkNewDb() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = "SELECT name FROM db2.sqlite_master WHERE type='table' AND name='open_chat_member'";
            const data = yield this.sendQuery(query);
            return data !== null && data.length > 0;
        });
    }
    decrypt(encType, b64Ciphertext, userId = this.BOT_ID) {
        return __awaiter(this, void 0, void 0, function* () {
            const decryptEndpoint = "/decrypt";
            const url = `${this.BOT_URL}${decryptEndpoint}`;
            const headers = { 'Content-Type': 'application/json' };
            const payload = { enc: encType, b64_ciphertext: b64Ciphertext, user_id: userId };
            try {
                const response = yield axios_1.default.post(url, JSON.stringify(payload), { headers });
                if (response.data.plain_text) {
                    return response.data.plain_text;
                }
                console.error(`Decrypt request failed: ${JSON.stringify(response.data)}`);
                return null;
            }
            catch (error) {
                console.error(`Error during decrypt request: ${error}`);
                return null;
            }
        });
    }
}
exports.KakaoDB = KakaoDB;
