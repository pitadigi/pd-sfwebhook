import * as jwt from 'jsonwebtoken';
const axios = require('axios').default;
import * as url from 'url';

import { ConfigFile } from './configFile';
import { SalesforceAccessInfo } from './salesforceAccessInfo';
import { SalesforcePostResult } from './salesforcePostResult';

export class SatoriCustomer {
    constructor(body: any) {
        this.token = body.token;
        this.contractId = body.contract_id;
        this.apexClass = body.apex_class;
        this.customer = body.customer;

        this.configFile = new ConfigFile();
    }

    /**
     * 事前に配布したトークン
     */
    public token: string;

    /**
     * 契約ID
     */
    public contractId: string;

    /**
     * 呼び出すApexクラス
     */
    public apexClass: string;

    /**
     * SATORIカスタマー情報
     */
    public customer: any;

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
            data = jwt.verify(this.token, publicKey, { algorithms: ['RS256'], subject: this.contractId});
        }
        catch(e) {
            return false;
        }

        return true;
    }

    /**
     * SalesforceのApexクラスを呼び出す
     */
    public async postToSalesforce(): Promise<SalesforcePostResult> {
        const salesforcePostResult: SalesforcePostResult = new SalesforcePostResult();

        // Apexを呼び出すためのインスタンスURL、アクセストークンを取得する
        const salesforceAccessInfo: SalesforceAccessInfo = await this.getAccessToken();
        if (!salesforceAccessInfo.result) {
            salesforcePostResult.result = false;
            salesforcePostResult.message = salesforceAccessInfo.message;
        }
        
        return salesforcePostResult;
    }

    /**
     * Apexクラスを呼び出すためのインスタンスURLとアクセストークンを取得する
     * @returns アクセス情報
     * {
     *   instanceUrl: インスタンスURL,
     *   accessToken: アクセストークン
     * }
     */
    private async getAccessToken(): Promise<SalesforceAccessInfo> {
        // 契約IDで秘密鍵を取得する
        const privateKey = await this.configFile.getConfigFile(this.contractId + '.key');
        // 契約IDで設定情報を取得する
        const configString = await this.configFile.getConfigFile(this.contractId + '.json');
        const config = JSON.parse(configString);

        // JWTのペイロードを作成する
        const payload = {
            iss: config.client_id,
            aud: config.login_url,
            sub: config.user_id,
            exp: Math.trunc(Date.now() / 1000) + (2 * 60),
        };
        const token = jwt.sign(payload, privateKey, {algorithm: 'RS256'});

        // SalesforceからインスタンスURLとアクセストークンを取得する
        const params = new url.URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: token,
        });

        let res;
        const salesforceAccessInfo: SalesforceAccessInfo = new SalesforceAccessInfo();
        try {
            res = await axios.post(config.login_url + '/services/oauth2/token', params);
        }
        catch(e) {
            salesforceAccessInfo.result = false;
            salesforceAccessInfo.message = e.message;
            return salesforceAccessInfo;
        }
        
        salesforceAccessInfo.instanceUrl = res.data.instance_url;
        salesforceAccessInfo.accessToken = res.data.access_token;
        return salesforceAccessInfo;
    }
}