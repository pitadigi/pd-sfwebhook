import * as jwt from 'jsonwebtoken';
const axios = require('axios').default;
import * as url from 'url';

import { ConfigFile } from './config-file';
import { SalesforceAccessInfo } from './salesforce-accessInfo';
import { SalesforcePostResult } from './salesforce-post-result';
import { SalesforcePostData } from './salesforce-post-data';
import { BodyData } from './body-data';

export class PostSalesforce {
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
    * Azure Service Busのキューから受信したデータをSalesforceに送信する
    */
    public async postToSalesforce(): Promise<SalesforcePostResult> {
        const salesforcePostResult: SalesforcePostResult = new SalesforcePostResult();
        
        // Apexを呼び出すためのインスタンスURL、アクセストークンを取得する
        const salesforceAccessInfo: SalesforceAccessInfo = await this.getAccessToken();
        if (!salesforceAccessInfo.result) {
            salesforcePostResult.result = false;
            salesforcePostResult.message = salesforceAccessInfo.message;
        }
        else {
            // SalesforceのApexクラスを呼び出す
            const url: string = salesforceAccessInfo.instanceUrl + '/services/apexrest/' + this.bodyData.apex_class + '/';
            const salesforcePostData: SalesforcePostData = new SalesforcePostData();
            salesforcePostData.customer = JSON.stringify(this.bodyData.customer);
            
            const config: any = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + salesforceAccessInfo.accessToken,
                },
            };
            
            let res;
            try {
                res = await axios.post(url, salesforcePostData, config);
            }
            catch(e) {
                salesforcePostResult.result = false;
                salesforcePostResult.message = 'Post data to salesforce failed: ' + e.message;
            }
            if (res && res.data) {
                salesforcePostResult.apexResult = JSON.parse(res.data);
            }
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
            const privateKey = await this.configFile.getConfigFile(this.bodyData.contract_id + '.key');
            // 契約IDで設定情報を取得する
            const configString = await this.configFile.getConfigFile(this.bodyData.contract_id + '.json');
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
                salesforceAccessInfo.message = 'Can not get access token from salesforce: ' + e.message;
                return salesforceAccessInfo;
            }
            
            salesforceAccessInfo.instanceUrl = res.data.instance_url;
            salesforceAccessInfo.accessToken = res.data.access_token;
            return salesforceAccessInfo;
        }
    }
    