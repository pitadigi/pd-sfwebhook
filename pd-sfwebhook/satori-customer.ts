import * as jwt from 'jsonwebtoken';
const axios = require('axios').default;
import * as url from 'url';
import { QueueClient } from '@azure/storage-queue';

import { ConfigFile } from './config-file';
import { PostResult } from './post-result';
import { BodyData } from './body-data';

export class SatoriCustomer {
    constructor(body: any) {
        this.bodyData = body;

        this.configFile = new ConfigFile();
    }

    /**
     * SATORIから取得したデータ
     */
    public bodyData: BodyData;

    /**
     * Config情報
     */
    private configFile: ConfigFile;

    /**
     * トークンを検証する
     * トークンをmaster公開鍵で検証する
     * トークンのissに設定されている契約IDとパラメータとして渡された契約IDが一致するかを検証する
     */
    public async verify(): Promise<boolean> {
        // Blobストレージからmaster公開鍵を取得する
        const publicKey: string = await this.configFile.getConfigFile(process.env.CONFIG_MASTER_PUBLIC_KEY);

        // 公開鍵でトークンを検証する
        let data: any;
        try {
            data = jwt.verify(this.bodyData.token, publicKey, { algorithms: ['RS256'], subject: this.bodyData.contract_id});
        }
        catch(e) {
            return false;
        }

        return true;
    }

    /**
     * Azure Storageのキューに送信する
     * Salesforceへのポストはキューを受信する側で行う(データをロスしないため)
     */
    public async postToStorageQueue(): Promise<PostResult> {
        const postResult: PostResult = new PostResult();

        const queueClient: QueueClient = new QueueClient(process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.AZURE_STORAGE_QUEUE_NAME);
        const message = Buffer.from(JSON.stringify(this.bodyData)).toString('base64');

        try {
            await queueClient.sendMessage(message);
        }
        catch(e) {
            postResult.result = false;
            postResult.message = 'Post data to Service Bus failed: ' + e.message;
        }

        return postResult;
    }
}
