import { AzureFunction, Context } from "@azure/functions"

import { PostSalesforce } from './post-salesforce';
import { SalesforcePostResult } from './salesforce-post-result';

/**
 * Storageキューからデータを取得し、SalesforceのApexクラスを呼び出す
 * Apexクラス呼び出しに成功したらキューを削除する
 * 呼び出しに失敗した場合は削除せずにエラーで返す
 * @param context 
 * @param pdSfWebhookQueue 
 */
const queueTrigger: AzureFunction = async function (context: Context, pdSfWebhookQueue: string): Promise<void> {
    if (!pdSfWebhookQueue) {
        context.done('No queue items');
        return;
    }

    const bodyData: any = context.bindings.pdSfWebhookQueue;

    const postSalesforce:PostSalesforce = new PostSalesforce(bodyData);

    const verify = await postSalesforce.verify();
    if (!verify) {
        context.done('Invalid token');
        return;
    }

    const salesforcePostResult: SalesforcePostResult = await postSalesforce.postToSalesforce();
    if (!salesforcePostResult.result) {
        context.done(salesforcePostResult.message);
        return;
    }

    context.done(null, salesforcePostResult);
};

export default queueTrigger;
