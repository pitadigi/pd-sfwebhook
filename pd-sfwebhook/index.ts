import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';

import { SatoriCustomer } from './satoriCustomer';
import { SalesforcePostResult } from './salesforcePostResult';

/**
 * SATORIのWebhookからカスタマー情報をSalesforceに登録する
 * SATORIのカスタマー情報はJSONで以下のように渡される
 * {
 *   token: 事前に配布したトークン(JWT)
 *   contract_id: 契約ID
 *   apex_class: 呼び出すApexクラス名
 *   constomer { カスタマー情報
 *     Salesforce項目API参照名: カスタマー値
 *   }
 * }
 * tokenに設定されたトークンを検証し、検証できなかったらエラーを返す
 * Blobストレージから契約情報「契約ID.json」、秘密鍵「契約ID.key」を取得する
 * 契約情報はJSON形式で以下のような構成
 * {
 *   client_id: Salesforce接続アプリケーションのコンシューマ鍵
 *   login_url: SalesforceのログインURL
 *   user_id: SalesforceのユーザID
 * }
 * 契約情報と秘密鍵を使いSalesforceにアクセスするためのトークンを作成、SalesforceからアクセスするためのインスタンスURL、アクセストークンを取得する
 * apex_classで指定されたApexクラスをREST APIとして呼び出す
 * SATORIのカスタマー情報は以下のJSONデータとして受け渡す
 * {
 *   customer: カスタマー情報を文字列変換したデータ
 * }
 * @param context 
 * @param req 
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
        dotenv.config();
    }

    // パラメータが空ならエラー
    if (!req.body) {
        context.res = {
            status: 400,
            body: 'Please pass a payload in the request body',
        };
        return;
    }

    // トークンを検証する
    const satoriCustomer: SatoriCustomer = new SatoriCustomer(req.body);
    const result: boolean = await satoriCustomer.verify();
    if (!result) {
        context.res = {
            status: 400,
            body: 'Invalid token',
        };
        return;
    }

    // SalesforceのApexクラスを呼び出す
    const salesforcePostResult = await satoriCustomer.postToSalesforce();

    if (!salesforcePostResult.result) {
        context.res = {
            status: 400,
            body: salesforcePostResult.message,
        };
    }
    else {
        context.res = {
            status: 200,
            body: salesforcePostResult.apexResult,
        };
    }
};

export default httpTrigger;
