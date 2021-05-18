export class SalesforceAccessInfo {
    /**
     * 取得結果
     * true: 取得 / false: エラー
     */
    public result: boolean = true;

    /**
     * メッセージ
     */
    public message: string;
    
    /**
     * インスタンスURL
     */
    public instanceUrl: string;

    /**
     * アクセストークン
     */
    public accessToken: string;
}